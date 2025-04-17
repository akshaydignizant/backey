// import { NextFunction, Request, Response } from "express";
// import redisClient from "../cache/redisClient";
// import httpError from "../util/httpError";
// import httpResponse from "../util/httpResponse";
// import { AuthRequest } from "../types/types";
// import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
// import dotenv from "dotenv";

// dotenv.config();

// // Middleware for authentication
// export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
//     try {
//         // Get token from header
//         const token = req.header("Authorization")?.split(" ")[1];

//         if (!token) {
//             return httpResponse(req, res, 401, "Access denied. No token provided.");
//         }

//         // Verify token with JWT
//         let decoded: JwtPayload | null = null;

//         try {
//             decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
//         } catch (error) {
//             if (error instanceof TokenExpiredError) {
//                 return httpResponse(req, res, 401, "Token has expired. Please log in again.");
//             }
//             if (error instanceof JsonWebTokenError) {
//                 return httpResponse(req, res, 401, "Invalid token.");
//             }
//             return httpError(next, error, req, 401);
//         }

//         if (!decoded?.userId) {
//             return httpResponse(req, res, 401, "Invalid token payload.");
//         }

//         // Fetch token from Redis
//         const redisToken = await redisClient.get(`auth:${decoded.userId}`);
//         if (!redisToken) {
//             return httpResponse(req, res, 401, "Session expired. Please log in again.");
//         }

//         if (redisToken !== token) {
//             return httpResponse(req, res, 401, "Invalid or mismatched token.");
//         }

//         // Attach userId to the request
//         req.user = { userId: decoded.userId };
//         next();
//     } catch (error) {
//         return httpError(next, error, req, 401);
//     }
// };

// middleware/auth.ts

import { Response, NextFunction } from 'express';
import redisClient from '../cache/redisClient';
import httpError from '../util/httpError';
import httpResponse from '../util/httpResponse';
import { AuthRequest } from '../types/types';
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Role } from '@prisma/client';

dotenv.config();

interface TokenPayload extends JwtPayload {
    userId: string;
    role: Role | null;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.split(' ')[1];

        if (!token) {
            return httpResponse(req, res, 401, 'Access denied. No token provided.');
        }

        // Verify token with JWT
        let decoded: TokenPayload | null = null;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
            console.log(`Token verified for user ${decoded.userId}, expires at: ${new Date((decoded.exp ?? 0) * 1000).toISOString()}`);
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                console.log(`Token expired for user ${decoded?.userId || 'unknown'}: ${error.message}`);
                return httpResponse(req, res, 401, 'Token has expired. Please log in again.');
            }
            if (error instanceof JsonWebTokenError) {
                console.log(`Invalid token: ${error.message}`);
                return httpResponse(req, res, 401, 'Invalid token.');
            }
            return httpError(next, error, req, 401);
        }

        if (!decoded?.userId) {
            console.log('Invalid token payload: missing userId');
            return httpResponse(req, res, 401, 'Invalid token payload.');
        }

        // Validate role
        if (decoded.role && !['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'].includes(decoded.role)) {
            console.log(`Invalid role in token: ${decoded.role}`);
            return httpResponse(req, res, 401, 'Invalid role in token.');
        }

        // Fetch token from Redis
        const redisToken = await redisClient.get(`auth:${decoded.userId}`);
        if (!redisToken) {
            console.log(`Redis key auth:${decoded.userId} not found or expired`);
            return httpResponse(req, res, 401, 'Session expired. Please log in again.');
        }

        if (redisToken !== token) {
            console.log(`Redis token mismatch for user ${decoded.userId}`);
            return httpResponse(req, res, 401, 'TOKEN_EXPIRED');
        }

        // Attach userId and role to the request
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return httpError(next, error, req, 401);
    }
};

// Middleware to require ADMIN role
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return httpResponse(req, res, 403, 'Admin access required.');
    }
    next();
};