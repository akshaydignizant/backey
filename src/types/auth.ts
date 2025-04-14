// // For Signup
// export interface SignupRequestBody {
//   firstName: string;
//   lastName?: string;
//   email: string;
//   password: string;
//   phone?: string;
// }

// // For Signin
// export interface SigninRequestBody {
//   email: string;
//   password: string;
// }

// // For Refresh Token
// export interface RefreshTokenRequestBody {
//   refreshToken: string;
// }

// // For Forgot Password
// export interface ForgotPasswordRequestBody {
//   email: string;
// }

// // For OTP Verification
// export interface VerifyOtpRequestBody {
//   otp: string;
// }

// // For Reset Password
// export interface ResetPasswordRequestBody {
//   resetToken: string;
//   newPassword: string;
// }


// export interface AuthResponseData {
//   accessToken: string;
//   refreshToken: string;
//   user: {
//     id: string;
//     email: string;
//     phone: string | null;
//     firstName: string;
//     lastName: string | null; // <-- change here
//     role: string;
//     isActive: boolean;
//     createdAt: Date;
//     updatedAt: Date;
//     lastLogin: Date | null;
//   };
// }

// types/auth.types.ts
import { Role } from '@prisma/client';

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
}

export interface SigninRequest {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface VerifyOtpRequest {
  otp: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}