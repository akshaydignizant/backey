import bcrypt from 'bcryptjs';
import prisma from '../util/prisma';
import redisClient, { RedisTTL } from '../cache/redisClient';
import { generateToken } from '../util/generateToken';
import sendEmail from '../util/sendEmail';
import httpError from '../util/httpError';
import { NextFunction } from 'express';
import crypto from "crypto";
import { Role } from '@prisma/client';

export const authService = {
  signupService: async (firstName: string, lastName: string, email: string, password: string, phone: string, role: Role) => {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        // phone,
      },
    });

    const { token, refreshToken } = generateToken(newUser.id, newUser.role as Role);
    await redisClient.setEx(`refresh:${newUser.id}`, 60 * 60 * 24 * 7, refreshToken); // 7 days

    return { token, refreshToken, user: newUser };
  },

  signInService: async (email: string, password: string) => {
    const user = await prisma.user.update({
      where: { email },
      data: { lastLogin: new Date() },
      select: {
        id: true, email: true, password: true, phone: true,
        firstName: true, lastName: true, role: true,
        isActive: true, createdAt: true, updatedAt: true, lastLogin: true,
      },
    });


    await prisma.user.update({
      where: { id: user?.id },
      data: { lastLogin: new Date() },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid email or password');
    }

    const { token, refreshToken } = generateToken(user.id, user.role as Role);
    await Promise.all([
      redisClient.setEx(`auth:${user.id}`, RedisTTL.ACCESS_TOKEN, token),
      redisClient.setEx(`refresh:${user.id}`, RedisTTL.REFRESH_TOKEN, refreshToken)
    ]);

    return { token, refreshToken, user };
  },

  refreshToken: async (userId: string, oldRefreshToken: string, role: string) => {
    const storedRefreshToken = await redisClient.get(`refresh:${userId}`);
    if (!storedRefreshToken || storedRefreshToken !== oldRefreshToken) {
      throw new Error('Refresh token is invalid or expired');
    }

    const { token, refreshToken } = generateToken(userId, role as Role);
    await Promise.all([
      await redisClient.setEx(`auth:${userId}`, RedisTTL.ACCESS_TOKEN, token),
      await redisClient.setEx(`refresh:${userId}`, RedisTTL.REFRESH_TOKEN, refreshToken)
    ]);

    return { token, refreshToken };
  },

  logout: async (userId: string) => {
    await redisClient.del(`auth:${userId}`);
    await redisClient.del(`refresh:${userId}`);
  },


  forgotPasswordService: async (email: string) => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { firstName: true, email: true }
    });

    if (!user) throw new Error("User not found");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.set(`otp:${otp}`, user.email, { EX: 300 });

    const emailHtml = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2d3748;">Hi ${user.firstName},</h2>
      <p style="font-size: 16px; color: #4a5568;">
        You recently requested to reset your password. Please use the following OTP (One-Time Password) to proceed:
      </p>
      <div style="margin: 20px 0; text-align: center;">
        <span style="display: inline-block; font-size: 24px; font-weight: bold; padding: 10px 20px; background-color: #edf2f7; color: #2d3748; border-radius: 6px; letter-spacing: 2px;">
          ${otp}
        </span>
      </div>
      <p style="font-size: 14px; color: #718096;">
        This OTP will expire in <strong>5 minutes</strong>. If you did not request a password reset, please ignore this email or contact support.
      </p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #a0aec0; text-align: center;">
        &copy; ${new Date().getFullYear()} Backey Management. All rights reserved.
      </p>
    </div>
  `;
    await sendEmail(user.email, "Password Reset OTP", emailHtml);

    return true;
  },

  verifyOtpService: async (otp: string) => {
    const email = await redisClient.get(`otp:${otp}`);
    if (!email) throw new Error("OTP expired or invalid");

    const user = await prisma.user.findUnique({
      where: { email }
      , select: { id: true, email: true }
    });
    if (!user) throw new Error("User not found");

    const resetToken = crypto.randomBytes(20).toString("hex");
    await redisClient.set(`reset:${resetToken}`, email, { EX: 300 });

    await redisClient.del(`otp:${otp}`);
    return resetToken;
  },


  resetPasswordService: async (resetToken: string, newPassword: string) => {
    const email = await redisClient.get(`reset:${resetToken}`);
    if (!email) throw new Error("OTP verification required or expired");

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });
    if (!user) throw new Error("User not found");

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
      select: { id: true, email: true, password: true }
    });

    await redisClient.del(`reset:${resetToken}`);
    return true;
  }
};
