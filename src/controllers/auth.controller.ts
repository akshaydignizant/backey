import { Request, Response, NextFunction } from 'express';
import httpResponse from '../util/httpResponse';
import httpError from '../util/httpError';
import { authService } from '../services/auth.service';
import jwt from 'jsonwebtoken';

export const authController = {
  signup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, email, password, phone } = req.body;
      if (!firstName || !lastName || !email || !password) {
        return httpResponse(req, res, 400, 'All fields are required');
      }
      if (password.length < 6) {
        return httpResponse(req, res, 400, 'Password must be at least 6 characters long');
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return httpResponse(req, res, 400, 'Invalid email format');
      }
      // if (!/^\d{10}$/.test(phone)) {
      //   return httpResponse(req, res, 400, 'Phone number must be 10 digits long');
      // }
      if (!/^[a-zA-Z0-9]+$/.test(firstName)) {
        return httpResponse(req, res, 400, 'firstName can only contain alphanumeric characters');
      }
      if (!/^[a-zA-Z0-9]+$/.test(lastName)) {
        return httpResponse(req, res, 400, 'lastName can only contain alphanumeric characters');
      }
      // if (!/^[a-zA-Z0-9]+$/.test(role)) {
      //   return httpResponse(req, res, 400, 'Role can only contain alphanumeric characters');
      // }
      // Ensure role is one of the enum strings
      // if (!["ADMIN", "MANAGER", "STAFF"].includes(role)) {
      //   return httpResponse(req, res, 400, "Invalid role");
      // }

      const data = await authService.signupService(firstName, lastName, email, password, phone);
      httpResponse(req, res, 201, 'User registered successfully', data);
    } catch (err) {
      httpError(next, err, req);
    }
  },

  signin: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const data = await authService.signInService(email, password);
      httpResponse(req, res, 200, 'Login successful', data);
    } catch (err) {
      httpError(next, err, req);
    }
  },

  refreshToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as jwt.JwtPayload;
      const data = await authService.refreshToken(decoded.userId, refreshToken);
      httpResponse(req, res, 200, 'Token refreshed', data);
    } catch (err) {
      httpError(next, err, req, 403);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return httpResponse(req, res, 401, 'Unauthorized');
      await authService.logout(userId);
      httpResponse(req, res, 200, 'Logout successful');
    } catch (err) {
      httpError(next, err, req);
    }
  },

  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) return httpResponse(req, res, 400, "Email is required");

      await authService.forgotPasswordService(email);
      return httpResponse(req, res, 200, "OTP sent to email");
    } catch (err) {
      httpError(next, err, req, 500);
    }
  },
  verifyOtp: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { otp } = req.body;
      if (!otp) return httpResponse(req, res, 400, "OTP is required");

      const resetToken = await authService.verifyOtpService(otp);
      return httpResponse(req, res, 200, "OTP verified", { resetToken });
    } catch (err) {
      httpError(next, err, req, 500);
    }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resetToken, newPassword } = req.body;
      if (!resetToken || !newPassword)
        return httpResponse(req, res, 400, "Reset token and new password are required");

      await authService.resetPasswordService(resetToken, newPassword);
      return httpResponse(req, res, 200, "Password reset successful");
    } catch (err) {
      httpError(next, err, req, 500);
    }
  },
};
