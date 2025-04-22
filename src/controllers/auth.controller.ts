import { Request, Response, NextFunction } from 'express';
import httpResponse from '../util/httpResponse';
import httpError from '../util/httpError';
import { authService } from '../services/auth.service';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { ForgotPasswordRequest, RefreshTokenRequest, ResetPasswordRequest, SigninRequest, SignupRequest, VerifyOtpRequest } from '../types/auth';
import { CryptoHelper } from '../util/crypto-helper';

export const authController = {
  signup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, email, password, phone, role, locationId, location } = req.body;

      if (!firstName || !email || !password) {
        return httpResponse(req, res, 400, 'First name, email, and password are required');
      }

      if (!/^[a-zA-Z0-9]+$/.test(firstName)) {
        return httpResponse(req, res, 400, 'First name must be alphanumeric');
      }

      if (lastName && !/^[a-zA-Z0-9]+$/.test(lastName)) {
        return httpResponse(req, res, 400, 'Last name must be alphanumeric');
      }

      if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return httpResponse(req, res, 400, 'Invalid email format');
      }

      if (password.length < 6) {
        return httpResponse(req, res, 400, 'Password must be at least 6 characters long');
      }

      const roleEnum =
        role && Object.values(Role).includes(role.toUpperCase() as Role)
          ? (role.toUpperCase() as Role)
          : Role.ADMIN;

      const userData = await authService.signupService(
        firstName.trim(),
        lastName?.trim() || null,
        email.toLowerCase(),
        password,
        phone ?? null,
        roleEnum,
        locationId ?? null,
        location ?? null
      );

      const encryptedResponse = CryptoHelper.encrypt({
        message: 'Signup successful',
        userData,
      });

      res.status(200).json({
        success: true,
        statusCode: 200,
        encryptedData: encryptedResponse.encryptedData,
        iv: encryptedResponse.iv,
      });

      // httpResponse(req, res, 200, 'Signup successful', userData);
    } catch (err) {
      return httpError(next, err, req);
    }
  },

  signin: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as SigninRequest;
      const data = await authService.signInService(email, password);
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
      // const { email, password } = req.body as SigninRequest;
      const { firstName, lastName, email, password, phone, role } = req.body;

      const encrypted = CryptoHelper.encrypt({ firstName, lastName, email, password, phone, role });

      res.status(200).json({
        success: true,
        message: 'Test encryption successful',
        encryptedPayload: encrypted,
      });
    } catch (err) {
      httpError(next, err, req);
    }
  },

  refreshToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body as RefreshTokenRequest;
      interface RefreshTokenPayload extends jwt.JwtPayload {
        userId: string;
        role: string;
      }
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as RefreshTokenPayload;
      const data = await authService.refreshToken(decoded.userId, refreshToken, decoded.role);
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

  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as ForgotPasswordRequest;
      if (!email) return httpResponse(req, res, 400, 'Email is required');

      await authService.forgotPasswordService(email);
      return httpResponse(req, res, 200, 'OTP sent to email');
    } catch (err) {
      httpError(next, err, req, 500);
    }
  },
  verifyOtp: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { otp } = req.body as VerifyOtpRequest;
      if (!otp) return httpResponse(req, res, 400, 'OTP is required');

      const resetToken = await authService.verifyOtpService(otp);
      return httpResponse(req, res, 200, 'OTP verified', { resetToken });
    } catch (err) {
      httpError(next, err, req, 500);
    }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resetToken, newPassword } = req.body as ResetPasswordRequest;
      if (!resetToken || !newPassword)
        return httpResponse(req, res, 400, 'Reset token and new password are required');

      await authService.resetPasswordService(resetToken, newPassword);
      return httpResponse(req, res, 200, 'Password reset successful');
    } catch (err) {
      httpError(next, err, req, 500);
    }
  },

  UpdateProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.user?.userId;
      const userId = req.params.id;
      if (!userId) {
        return httpResponse(req, res, 403, 'Profile not found');
      }
      if (!id)
        return httpResponse(req, res, 401, 'Unauthorized');

      const updatedUser = await authService.updateUserProfileService(userId, req.body);
      httpResponse(req, res, 200, 'Profile updated successfully', updatedUser);
    } catch (error: any) {
      return httpError(next, error, req, 500);
    }
  },
}
