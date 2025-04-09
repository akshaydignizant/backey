import {Request, Response, NextFunction } from "express";
import mongoose from "mongoose";


// Middleware to validate MongoDB ObjectId (applies only to routes that require userId)

export const validateUserId = (req: Request, res: Response, next: NextFunction): void => {
  const { userId } = req.params;
  if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({ success: false, message: "Invalid MongoDB ObjectId format" });
  } else {
    next();
  }
};