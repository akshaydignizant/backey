import { body } from "express-validator";

export const signUpValidator = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

export const signInValidator = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidator = [
  body("email").isEmail().withMessage("Valid email is required"),
];

export const resetPasswordValidator = [
  body("resetToken").notEmpty().withMessage("Reset token is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];
