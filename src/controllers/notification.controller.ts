import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { z } from 'zod';
import { Role } from '@prisma/client';

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

const bulkDeleteSchema = z.object({
    notificationIds: z.array(z.string().uuid()),
});

export const getNotifications = async (req: Request, res: Response) => {
    try {
        // const { workspaceId } = req.params;
        const { limit, offset, type, isRead } = querySchema.parse(req.query);
        const userId = req.user?.userId; // Assuming authMiddleware adds user to req
        const notifications = await notificationService.getNotifications(userId as string, {
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
        const userId = req.user?.userId;

        await notificationService.markNotificationAsRead(
            parseInt(workspaceId),
            notificationId,
            userId as string
        );

        res.status(200).json({ isRead: true }); // only returning the updated status
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to mark notification as read' });
    }
};


export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { workspaceId, notificationId } = req.params;
        const userId = req.user?.userId;
        const roles = req.user?.roles || [];

        const result = await notificationService.deleteNotification({
            notificationId,
            workspaceId: parseInt(workspaceId),
            userId: userId!,
            userRoles: roles.filter((role) => role.workspaceId !== null) as { role: Role; workspaceId: number }[],
        });

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to delete notification' });
    }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
    try {
        const workspaceId = parseInt(req.params.workspaceId);
        const userId = req.user?.userId;
        const result = await notificationService.markAllAsRead(workspaceId, userId as string);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to mark all as read' });
    }
};


export const getUnreadNotificationsCount = async (req: Request, res: Response) => {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.userId;

    const count = await notificationService.getUnreadCount(workspaceId, userId as string);
    res.json({ count });
};

export const filterNotifications = async (req: Request, res: Response) => {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.userId;
    const filters = req.query;

    const result = await notificationService.filter(workspaceId, userId as string, filters);
    res.json(result);
};

export const updateNotification = async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    const workspaceId = parseInt(req.params.workspaceId);
    const data = req.body;

    const result = await notificationService.update(workspaceId, notificationId, data);
    res.json(result);
};

// export const sendNotificationToUser = async (req: Request, res: Response) => {
//     const { userId } = req.params;
//     const workspaceId = parseInt(req.params.workspaceId);
//     const data = req.body;

//     try {
//         const io = req.app.get('io'); // Socket.IO instance

//         const result = await notificationService.sendToUser(workspaceId, userId, data, io);

//         res.status(200).json(result);
//     } catch (error) {
//         console.error('sendNotificationToUser error:', error);
//         res.status(500).json({ message: 'Failed to send notification' });
//     }
// };

export const sendNotificationToUser = async (req: Request, res: Response) => {
    const { userIds } = req.body;
    const workspaceId = parseInt(req.params.workspaceId);
    const notificationData = req.body.notification;

    try {
        const io = req.app.get('io');
        const results = [];

        for (const userId of userIds) {
            const result = await notificationService.sendToUser(workspaceId, userId, {
                ...notificationData,
                userId,
            }, io);

            results.push(result);
        }

        res.status(200).json({ message: 'Notifications sent', results });
    } catch (error) {
        console.error('sendNotificationToUsers error:', error);
        res.status(500).json({ message: 'Failed to send notifications to users' });
    }
};


export const bulkDeleteNotifications = async (req: Request, res: Response) => {
    try {
        const workspaceId = parseInt(req.params.workspaceId);
        const { notificationIds } = bulkDeleteSchema.parse(req.body);
        const result = await notificationService.bulkDelete(workspaceId, notificationIds);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to delete notifications' });
    }
};