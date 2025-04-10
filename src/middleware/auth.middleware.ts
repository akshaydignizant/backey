import { NextFunction, Request, Response } from "express";
import redisClient from "../cache/redisClient";
import httpError from "../util/httpError";
import httpResponse from "../util/httpResponse";
import { AuthRequest } from "../types/types";
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Middleware for authentication
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Get token from header
        const token = req.header("Authorization")?.split(" ")[1];

        if (!token) {
            return httpResponse(req, res, 401, "Access denied. No token provided.");
        }

        // Verify token with JWT
        let decoded: JwtPayload | null = null;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                return httpResponse(req, res, 401, "Token has expired. Please log in again.");
            }
            if (error instanceof JsonWebTokenError) {
                return httpResponse(req, res, 401, "Invalid token.");
            }
            return httpError(next, error, req, 401);
        }

        if (!decoded?.userId) {
            return httpResponse(req, res, 401, "Invalid token payload.");
        }

        // Fetch token from Redis
        const redisToken = await redisClient.get(`auth:${decoded.userId}`);
        if (!redisToken) {
            return httpResponse(req, res, 401, "Session expired. Please log in again.");
        }

        if (redisToken !== token) {
            return httpResponse(req, res, 401, "Invalid or mismatched token.");
        }

        // Attach userId to the request
        req.user = { userId: decoded.userId };
        next();
    } catch (error) {
        return httpError(next, error, req, 401);
    }
};

// import { NextFunction, Request, Response } from "express";
// import redisClient from "../cache/redisClient";
// import httpError from "../utils/httpError";
// import httpResponse from "../utils/httpResponse";
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
