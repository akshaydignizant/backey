import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { z } from 'zod';

// Validation schemas
const querySchema = z.object({
    limit: z.string().optional().default('50').transform(Number).refine((val) => val > 0 && val <= 100, {
        message: 'Limit must be between 1 and 100',
    }),
    offset: z.string().optional().default('0').transform(Number).refine((val) => val >= 0, {
        message: 'Offset must be non-negative',
    }),
    type: z.enum(['LOW_STOCK', 'ORDER_UPDATE', 'INVITATION', 'SYSTEM']).optional(),
    isRead: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
});

const createNotificationSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    title: z.string().min(1, 'Title is required').max(100),
    message: z.string().min(1, 'Message is required').max(500),
    type: z.enum(['LOW_STOCK', 'ORDER_UPDATE', 'INVITATION', 'SYSTEM']),
});

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { limit, offset, type, isRead } = querySchema.parse(req.query);
        const userId = req.user?.userId; // Assuming authMiddleware adds user to req
        const notifications = await notificationService.getNotifications(parseInt(workspaceId), userId as string, {
            limit,
            offset,
            type,
            isRead,
        });
        res.status(200).json(notifications);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to fetch notifications' });
    }
};

export const createNotification = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const data = createNotificationSchema.parse(req.body);
        const notification = await notificationService.createNotification(parseInt(workspaceId), data);
        res.status(201).json(notification);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create notification' });
    }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
    try {
        const { workspaceId, notificationId } = req.params;
        const userId = req.user?.userId; // Assuming authMiddleware adds user to req
        const notification = await notificationService.markNotificationAsRead(
            parseInt(workspaceId),
            notificationId,
            userId as string
        );
        res.status(200).json(notification);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to mark notification as read' });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { workspaceId, notificationId } = req.params;
        const userId = req.user?.userId; // Assuming authMiddleware adds user to req
        const notification = await notificationService.deleteNotification(
            parseInt(workspaceId),
            notificationId,
            userId as string
        );
        res.status(200).json(notification);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to delete notification' });
    }
};