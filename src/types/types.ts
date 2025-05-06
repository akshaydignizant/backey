import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { Request } from 'express';
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

declare module 'express-serve-static-core' {
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

export type ReportType =
    | 'sales'
    | 'inventory'
    | 'customer'
    | 'employee-performance'
    | 'financial-summary'
    | 'product-performance'
    | 'order-fulfillment'
    | 'shipping'
    | 'low-stock'
    | 'abandoned-carts'
    | 'payment-methods'
    | 'category-performance'
    | 'user-signups';

export type DateRangeFilter = {
    startDate?: string;
    endDate?: string;
};

export type PaginationFilter = {
    page?: number;
    pageSize?: number;
    limit?: number;
    offset?: number;
};

export type SortFilter = {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type ReportFilters = DateRangeFilter & PaginationFilter & SortFilter & {
    status?: OrderStatus | OrderStatus[];
    paymentStatus?: PaymentStatus | PaymentStatus[];
    threshold?: number;
    hours?: number;
    categoryId?: string;
    productId?: string;
    userId?: string;
    lastOrders?: number;
};

export type ReportParams = {
    workspaceId: number;
    filters: ReportFilters;
};