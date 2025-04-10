import bcrypt from 'bcryptjs';
import prisma from '../util/prisma';
import redisClient from '../cache/redisClient';
import { generateToken } from '../util/generateToken';
import sendEmail from '../util/sendEmail';
import { Role } from '@prisma/client';

export const authService = {
  signupService: async (firstName: string, lastName: string, email: string, password: string, role: Role, phone: string) => {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        // role: Role.ADMIN,
        // phone,
      },
    });

    const { token, refreshToken } = generateToken(newUser.id);
    await redisClient.setEx(`refresh:${newUser.id}`, 60 * 60 * 24 * 7, refreshToken); // 7 days

    return { token, refreshToken, user: newUser };
  },

  signin: async (email: string, password: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid email or password');
    }

    const { token, refreshToken } = generateToken(user.id);
    await redisClient.setEx(`auth:${user.id}`, 3600, token); // 1 hour
    await redisClient.setEx(`refresh:${user.id}`, 604800, refreshToken); // 7 days

    return { token, refreshToken, user };
  },

  refreshToken: async (userId: string, oldRefreshToken: string) => {
    const storedRefreshToken = await redisClient.get(`refresh:${userId}`);
    if (!storedRefreshToken || storedRefreshToken !== oldRefreshToken) {
      throw new Error('Refresh token is invalid or expired');
    }

    const { token, refreshToken } = generateToken(userId);
    await redisClient.setEx(`auth:${userId}`, 3600, token);
    await redisClient.setEx(`refresh:${userId}`, 604800, refreshToken);

    return { token, refreshToken };
  },


  logout: async (userId: string) => {
    await redisClient.del(`auth:${userId}`);
    await redisClient.del(`refresh:${userId}`);
  },


  forgotPassword: async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('No account found with this email');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.setEx(`otp:${email}`, 300, otp); // Store OTP with email as key

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
    await sendEmail(email, 'Reset Password OTP', emailHtml);

    return true;
  },

  verifyOtp: async (otp: string) => {
    const email = await redisClient.get(`otp:${otp}`);
    if (!email) throw new Error('OTP expired or invalid');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    // Store for password reset
    await redisClient.setEx(`reset:${email}`, 300, email);
    await redisClient.del(`otp:${otp}`);

    return email;
  },

  resetPassword: async (email: string, newPassword: string) => {
    const storedEmail = await redisClient.get(`reset:${email}`);
    if (!storedEmail || storedEmail !== email) {
      throw new Error('OTP verification required or expired');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await redisClient.del(`reset:${email}`);
    return true;
  },
};
