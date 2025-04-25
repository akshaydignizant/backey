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

// import { Response, NextFunction } from 'express';
// import redisClient from '../cache/redisClient';
// import httpError from '../util/httpError';
// import httpResponse from '../util/httpResponse';
// import { AuthRequest } from '../types/types';
// import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
// import dotenv from 'dotenv';
// import { Role } from '@prisma/client';

// dotenv.config();

// interface TokenPayload extends JwtPayload {
//     userId: string;
//     role: Role | null;
// }

// export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
//     try {
//         // Get token from header
//         const token = req.header('Authorization')?.split(' ')[1];

//         if (!token) {
//             return httpResponse(req, res, 401, 'Access denied. No token provided.');
//         }

//         // Verify token with JWT
//         let decoded: TokenPayload | null = null;

//         try {
//             decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
//             console.log(`Token verified for user ${decoded.userId}, expires at: ${new Date((decoded.exp ?? 0) * 1000).toISOString()}`);
//         } catch (error) {
//             // if (error instanceof TokenExpiredError) {
//             //     console.log(`Token expired for user ${decoded?.userId || 'unknown'}: ${error.message}`);
//             //     return httpResponse(req, res, 401, 'Token has expired. Please log in again.');
//             // }
//             if (error instanceof TokenExpiredError) {
//                 console.log(`Token expired for user ${decoded?.userId || 'unknown'}: ${error.message}`);
//                 res.status(401).json({
//                     success: true,
//                     statusCode: 401,
//                     request: {
//                         ip: req.ip,
//                         method: req.method,
//                         url: req.originalUrl,
//                     },
//                     message: 'Token has expired. Please log in again.',
//                     data: null,
//                     errorCode: 'TOKEN_EXPIRED',
//                 });
//                 return
//             }
//             if (error instanceof JsonWebTokenError) {
//                 console.log(`Invalid token: ${error.message}`);
//                 return httpResponse(req, res, 401, 'Invalid token.');
//             }
//             return httpError(next, error, req, 401);
//         }

//         if (!decoded?.userId) {
//             console.log('Invalid token payload: missing userId');
//             return httpResponse(req, res, 401, 'Invalid token payload.');
//         }

//         // Validate role
//         if (decoded.role && !['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'].includes(decoded.role)) {
//             console.log(`Invalid role in token: ${decoded.role}`);
//             return httpResponse(req, res, 401, 'Invalid role in token.');
//         }

//         // Fetch token from Redis
//         const redisToken = await redisClient.get(`auth:${decoded.userId}`);
//         if (!redisToken) {
//             console.log(`Redis key auth:${decoded.userId} not found or expired`);
//             res.status(401).json({
//                 success: true,
//                 statusCode: 401,
//                 request: {
//                     ip: req.ip,
//                     method: req.method,
//                     url: req.originalUrl,
//                 },
//                 message: 'Session expired. Please log in again.',
//                 data: null,
//                 errorCode: 'TOKEN_EXPIRED',
//             });
//             return
//         }

//         if (redisToken !== token) {
//             console.log(`Redis token mismatch for user ${decoded.userId}`);
//             res.status(401).json({
//                 success: true,
//                 statusCode: 401,
//                 request: {
//                     ip: req.ip,
//                     method: req.method,
//                     url: req.originalUrl,
//                 },
//                 message: 'Invalid or mismatched token.',
//                 data: null,
//                 errorCode: 'TOKEN_EXPIRED',
//             });
//             return
//         }

//         // Attach userId and role to the request
//         req.user = {
//             userId: decoded.userId,
//             role: decoded.role,
//         };

//         next();
//     } catch (error) {
//         console.error('Auth middleware error:', error);
//         return httpError(next, error, req, 401);
//     }
// };

// // Middleware to require ADMIN role
// export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
//     if (!req.user || req.user.role !== 'ADMIN') {
//         return httpResponse(req, res, 403, 'Admin access required.');
//     }
//     next();
// };

// src/middlewares/auth.middleware.ts
import { Response, NextFunction } from 'express';
import redisClient from '../cache/redisClient';
import httpError from '../util/httpError';
import httpResponse from '../util/httpResponse';
import { AuthRequest } from '../types/types';
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../util/prisma';

interface TokenPayload extends JwtPayload {
    userId: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) {
            return httpResponse(req, res, 401, 'Access denied. No token provided.', 'NO_TOKEN');
        }

        let decoded: TokenPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
            console.log(`Token verified for user ${decoded.userId}, expires at: ${new Date((decoded.exp ?? 0) * 1000).toISOString()}`);
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                console.log(`Token expired: ${error.message}`);
                return httpResponse(req, res, 401, 'Token has expired. Please log in again.', 'TOKEN_EXPIRED');
            }
            if (error instanceof JsonWebTokenError) {
                console.log(`Invalid token: ${error.message}`);
                return httpResponse(req, res, 401, 'Invalid token.', 'TOKEN_INVALID');
            }
            return httpError(next, error, req, 401);
        }

        if (!decoded.userId) {
            console.log('Invalid token payload: missing userId');
            return httpResponse(req, res, 401, 'Invalid token payload.', 'INVALID_PAYLOAD');
        }

        // Verify token in Redis
        const redisToken = await redisClient.get(`auth:${decoded.userId}`);
        if (!redisToken) {
            console.log(`Redis key auth:${decoded.userId} not found or expired`);
            return httpResponse(req, res, 401, 'Session expired. Please log in again.', 'TOKEN_EXPIRED');
        }

        if (redisToken !== token) {
            console.log(`Redis token mismatch for user ${decoded.userId}`);
            return httpResponse(req, res, 401, 'Invalid or mismatched token.', 'TOKEN_MISMATCH');
        }

        // Fetch user roles from UserRole table
        const workspaceId = req.headers['x-workspace-id'] as string | undefined;
        let roles: { role: Role; workspaceId: number | null }[] = [];

        if (workspaceId) {
            if (isNaN(parseInt(workspaceId))) {
                return httpResponse(req, res, 400, 'Invalid workspace ID.', 'INVALID_WORKSPACE_ID');
            }
            const userRoles = await prisma.userRole.findMany({
                where: {
                    userId: decoded.userId,
                    workspaceId: parseInt(workspaceId),
                },
                select: { role: true, workspaceId: true },
            });
            roles = userRoles.map((ur) => ({
                role: ur.role,
                workspaceId: ur.workspaceId,
            }));
            if (roles.length === 0) {
                console.log(`No roles found for user ${decoded.userId} in workspace ${workspaceId}`);
                return httpResponse(req, res, 403, 'No roles assigned in this workspace.', 'NO_ROLES');
            }
        } else {
            const userRoles = await prisma.userRole.findMany({
                where: { userId: decoded.userId },
                select: { role: true, workspaceId: true },
            });
            roles = userRoles.map((ur) => ({
                role: ur.role,
                workspaceId: ur.workspaceId,
            }));
            // Optional: Require workspaceId for routes needing specific roles
            // if (roles.length === 0) {
            //   return httpResponse(req, res, 403, 'No roles assigned to user.', 'NO_ROLES');
            // }
        }

        // Attach userId and roles to the request
        req.user = {
            userId: decoded.userId,
            roles,
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return httpError(next, error, req, 401);
    }
};