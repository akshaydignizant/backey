import { Role } from "@prisma/client";
import { Request } from "express";
import jwt from 'jsonwebtoken';
export type THttpResponse = {
    success: boolean
    statusCode: number
    request: {
        ip?: string | null
        method: string
        url: string
    }
    message: string
    data?: unknown  // Make data optional
    meta?: unknown | null
}

export type THttpError = {
    success: boolean
    statusCode: number
    request: {
        ip?: string | null
        method: string
        url: string
    }
    message: string
    data: unknown
    trace?: object | null
}

export interface AuthRequest extends Request {
    user?: any;
}

declare module "express-serve-static-core" {
    interface Request {
        user?: {
            userId: string;
            id?: string
            userEmail: string;
            // role: Role | null;
            roles: { role: Role; workspaceId: number | null }[]
            permissions?: string[];
            workspaceId?: string;

        };
    }
}



export interface JwtPayloadWithUserId extends jwt.JwtPayload {
    userId: string;
    role?: string;
}

export interface SearchParams {
    search?: string;
    page: number;
    limit: number;
}