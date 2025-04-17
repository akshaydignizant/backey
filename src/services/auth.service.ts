import bcrypt from 'bcryptjs';
import prisma from '../util/prisma';
import redisClient, { RedisTTL } from '../cache/redisClient';
import { generateToken } from '../util/generateToken';
import sendEmail from '../util/sendEmail';
import crypto from 'crypto';
import { Role } from '@prisma/client';

export const authService = {
  signupService: async (
    firstName: string,
    lastName: string | null,
    email: string,
    password: string,
    phone: string | null,
    role: Role
  ) => {
    // Check for existing user by email or phone
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: {
        id: true,
        email: true,

      },
    });

    if (existingUser) throw new Error('User with this email or phone already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        phone,
      },
    });

    // Generate tokens
    const { token, refreshToken } = generateToken(newUser.id, newUser.role as Role);

    // Store tokens in Redis
    await Promise.all([
      redisClient.setEx(`auth:${newUser.id}`, RedisTTL.ACCESS_TOKEN, token),
      redisClient.setEx(`refresh:${newUser.id}`, RedisTTL.REFRESH_TOKEN, refreshToken),
    ]);

    // Return tokens and user info
    return {
      token,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
    };
  },


  signInService: async (email: string, password: string) => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      throw new Error('Invalid email or password'); // Could log more specific info but avoid exposing sensitive data
    }

    // Check if the password is valid
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update the last login time
    await prisma.user.update({
      where: { id: user.id },
      select: { id: true, lastLogin: true },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const { token, refreshToken } = generateToken(user.id, user.role as Role);

    // Store tokens in Redis
    await Promise.all([
      redisClient.setEx(`auth:${user.id}`, RedisTTL.ACCESS_TOKEN, token),
      redisClient.setEx(`refresh:${user.id}`, RedisTTL.REFRESH_TOKEN, refreshToken),
    ]);

    // Return token and user information
    return { token, refreshToken, user: { id: user.id, email: user.email, role: user.role } }; // Only return essential user data
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

    if (!user) throw new Error('User not found');

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
    await sendEmail(user.email, 'Password Reset OTP', emailHtml);

    return true;
  },

  verifyOtpService: async (otp: string) => {
    const email = await redisClient.get(`otp:${otp}`);
    if (!email) throw new Error('OTP expired or invalid');

    const user = await prisma.user.findUnique({
      where: { email }
      , select: { id: true, email: true }
    });
    if (!user) throw new Error('User not found');

    const resetToken = crypto.randomBytes(20).toString('hex');
    await redisClient.set(`reset:${resetToken}`, email, { EX: 300 });

    await redisClient.del(`otp:${otp}`);
    return resetToken;
  },


  resetPasswordService: async (resetToken: string, newPassword: string) => {
    const email = await redisClient.get(`reset:${resetToken}`);
    if (!email) throw new Error('OTP verification required or expired');

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });
    if (!user) throw new Error('User not found');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
      select: { id: true, email: true, password: true }
    });

    await redisClient.del(`reset:${resetToken}`);
    return true;
  },

  updateUserProfileService: async (userId: string, data: any) => {
    const {
      firstName,
      lastName,
      phone,
      profileImageUrl,
      email,
      locationId
    } = data;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone,
        profileImageUrl,
        email,
        locationId,
        updatedAt: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        profileImageUrl: true,
        locationId: true,
        updatedAt: true
      }
    });

    return updatedUser;
  },
  // adminUpdateUserProfileService: async (
  //   workspaceId: string,
  //   targetUserId: string,
  //   updateData: {
  //     email?: string;
  //     fullName?: string;
  //     phoneNumber?: string;
  //     role?: Role;
  //     designation?: string;
  //   }
  // ) => {
  //   const user = await prisma.user.findUnique({
  //     where: { id: targetUserId },
  //     select: { id: true, role: true },
  //   });

  //   if (!user) {
  //     throw new Error('User not found');
  //   }

  //   // Ensure the user belongs to the same workspace and is not an ADMIN
  //   if (user. !== workspaceId || !['MANAGER', 'STAFF'].includes(user.role)) {
  //     throw new Error('Unauthorized to update this user');
  //   }

  //   const updatedUser = await prisma.user.update({
  //     where: { id: targetUserId },
  //     data: {
  //       ...updateData,
  //     },
  //   });

  //   return updatedUser;
  // },

};
