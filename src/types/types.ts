import { Request } from "express";
export type THttpResponse = {
    success: boolean
    statusCode: number
    request: {
        ip?: string | null
        method: string
        url: string
    }
    message: string
    data: unknown
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
        };
    }
  }