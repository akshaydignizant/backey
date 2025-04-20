import { Request, Response } from 'express';
import { reportService } from '../services/report.service';
import { z } from 'zod';

// Validation schema for query parameters
const reportQuerySchema = z.object({
    startDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid startDate',
    }),
    endDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid endDate',
    }),
    limit: z.string().optional().default('50').transform(Number).refine((val) => val > 0 && val <= 100, {
        message: 'Limit must be between 1 and 100',
    }),
    offset: z.string().optional().default('0').transform(Number).refine((val) => val >= 0, {
        message: 'Offset must be non-negative',
    }),
});

export const getSalesReport = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate, endDate, limit, offset } = reportQuerySchema.parse(req.query);
        const report = await reportService.getSalesReport(parseInt(workspaceId), {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit,
            offset,
        });
        res.status(200).json(report);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to generate sales report' });
    }
};

export const getInventoryReport = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { limit, offset } = reportQuerySchema.parse(req.query);
        const report = await reportService.getInventoryReport(parseInt(workspaceId), { limit, offset });
        res.status(200).json(report);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to generate inventory report' });
    }
};

export const getCustomerReport = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate, endDate, limit, offset } = reportQuerySchema.parse(req.query);
        const report = await reportService.getCustomerReport(parseInt(workspaceId), {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit,
            offset,
        });
        res.status(200).json(report);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to generate customer report' });
    }
};

export const getEmployeePerformanceReport = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate, endDate, limit, offset } = reportQuerySchema.parse(req.query);
        const report = await reportService.getEmployeePerformanceReport(parseInt(workspaceId), {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit,
            offset,
        });
        res.status(200).json(report);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to generate employee performance report' });
    }
};