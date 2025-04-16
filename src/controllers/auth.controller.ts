import { Request, Response, NextFunction } from 'express';
import httpResponse from '../util/httpResponse';
import httpError from '../util/httpError';
import { authService } from '../services/auth.service';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { ForgotPasswordRequest, RefreshTokenRequest, ResetPasswordRequest, SigninRequest, SignupRequest, VerifyOtpRequest } from '../types/auth';
import { CryptoHelper } from '../util/crypto-helper';

export const authController = {
  signup: async (req: Request<{}, {}, SignupRequest>, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, email, password, phone, role } = req.body;

      // Required fields check
      if (!firstName || !email || !password) {
        return httpResponse(req, res, 400, 'First name, email, and password are required');
      }

      // Validate first name (alphanumeric)
      if (!/^[a-zA-Z0-9]+$/.test(firstName)) {
        return httpResponse(req, res, 400, 'First name must be alphanumeric');
      }

      // Optional last name check (if provided)
      if (lastName && !/^[a-zA-Z0-9]+$/.test(lastName)) {
        return httpResponse(req, res, 400, 'Last name must be alphanumeric');
      }

      // Email format
      if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return httpResponse(req, res, 400, 'Invalid email format');
      }

      // Password strength
      if (password.length < 6) {
        return httpResponse(req, res, 400, 'Password must be at least 6 characters long');
      }

      // Phone (optional, if given)
      const trimmedPhone = phone?.trim() || null;
      if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
        return httpResponse(req, res, 400, 'Phone number must be exactly 10 digits');
      }

      // Role (optional): default to ADMIN if not passed
      const roleEnum =
        role && Object.values(Role).includes(role.toUpperCase() as Role)
          ? (role.toUpperCase() as Role)
          : Role.ADMIN;

      const userData = await authService.signupService(
        firstName.trim(),
        lastName?.trim() || null,
        email.toLowerCase(),
        password,
        trimmedPhone,
        roleEnum
      );

      httpResponse(req, res, 200, 'Signup successful', userData);
    } catch (err) {
      return httpError(next, err, req);
    }
  },

  signin: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as SigninRequest;
      const data = await authService.signInService(email, password);
      // Encrypting response for frontend
      const encryptedResponse = CryptoHelper.encrypt({
        message: 'Login successful',
        data,
      });

      res.status(200).json({
        success: true,
        statusCode: 200,
        encryptedData: encryptedResponse.encryptedData,
        iv: encryptedResponse.iv,
      });
      // httpResponse(req, res, 200, 'Login successful', data);
    } catch (err) {
      httpError(next, err, req);
    }
  },
  signintest: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as SigninRequest;
      // const { firstName, lastName, email, password, phone, role } = req.body;

      const encrypted = CryptoHelper.encrypt({ email, password });

      res.status(200).json({
        success: true,
        message: 'Test encryption successful',
        encryptedPayload: encrypted,
      });
    } catch (err) {
      httpError(next, err, req);
    }
  },

  refreshToken: async (req: Request<{}, {}, RefreshTokenRequest>, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as jwt.JwtPayload;
      const data = await authService.refreshToken(decoded.userId, refreshToken, decoded.role as string);
      httpResponse(req, res, 200, 'Token refreshed', data);
    } catch (err) {
      httpError(next, err, req, 403);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId)
        httpResponse(req, res, 401, 'Unauthorized');
      await authService.logout(userId as string);
      httpResponse(req, res, 200, 'Logout successful');
    } catch (err) {
      httpError(next, err, req);
    }
  },

  forgotPassword: async (req: Request<{}, {}, ForgotPasswordRequest>, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) return httpResponse(req, res, 400, 'Email is required');

      await authService.forgotPasswordService(email);
      return httpResponse(req, res, 200, 'OTP sent to email');
    } catch (err) {
      httpError(next, err, req, 500);
    }
  },
  verifyOtp: async (req: Request<{}, {}, VerifyOtpRequest>, res: Response, next: NextFunction) => {
    try {
      const { otp } = req.body;
      if (!otp) return httpResponse(req, res, 400, 'OTP is required');

      const resetToken = await authService.verifyOtpService(otp);
      return httpResponse(req, res, 200, 'OTP verified', { resetToken });
    } catch (err) {
      httpError(next, err, req, 500);
    }
  },

  resetPassword: async (req: Request<{}, {}, ResetPasswordRequest>, res: Response, next: NextFunction) => {
    try {
      const { resetToken, newPassword } = req.body;
      if (!resetToken || !newPassword)
        return httpResponse(req, res, 400, 'Reset token and new password are required');

      await authService.resetPasswordService(resetToken, newPassword);
      return httpResponse(req, res, 200, 'Password reset successful');
    } catch (err) {
      httpError(next, err, req, 500);
    }
  },
};
