import { PrismaClient, NotificationType, Role } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient({ log: ['error'] });

// Validation schemas
const optionsSchema = z.object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    type: z.nativeEnum(NotificationType).optional(),
    isRead: z.boolean().optional(),
}).strict();

const createNotificationSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    title: z.string().min(1, 'Title is required').max(100),
    message: z.string().min(1, 'Message is required').max(500),
    type: z.nativeEnum(NotificationType),
});

interface DeleteNotificationParams {
    notificationId: string;
    workspaceId: number;
    userId: string;
    userRoles: { role: Role; workspaceId: number }[];
}

// Notification Service
export const notificationService = {
    async getNotifications(userId: string, options: {
        limit?: number;
        offset?: number;
        type?: NotificationType;
        isRead?: boolean;
    }) {
        const parsedOptions = optionsSchema.parse(options);

        const [user] = await Promise.all([
            // prisma.workspace.findUnique({ where: { id: workspaceId } }),
            prisma.user.findUnique({ where: { id: userId } }),
        ]);

        // if (!workspace) throw new Error('Workspace not found');
        if (!user) throw new Error('User not found');

        const whereClause = {
            // workspaceId,
            userId,
            ...(parsedOptions.type ? { type: parsedOptions.type } : {}),
            ...(parsedOptions.isRead !== undefined ? { isRead: parsedOptions.isRead } : {}),
        };

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip: parsedOptions.offset,
                take: parsedOptions.limit,
            }),
            prisma.notification.count({ where: whereClause }),
        ]);

        return {
            // workspaceId,
            userId,
            total,
            notifications,
            pagination: { ...parsedOptions },
        };
    },

    deleteNotification: async ({
        notificationId,
        workspaceId,
        userId,
        userRoles,
    }: DeleteNotificationParams) => {
        // Validate inputs
        if (!notificationId || !workspaceId) {
            throw new Error('Notification ID and workspace ID are required');
        }

        // Check if the user has ADMIN or MANAGER role in the workspace
        const hasAdminOrManagerRole = userRoles.some(
            (roleObj) =>
                [Role.ADMIN, Role.MANAGER, Role.STAFF, Role.CUSTOMER].includes(roleObj.role) &&
                roleObj.workspaceId === workspaceId
        );

        // Fetch the notification
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
            select: { id: true, userId: true, workspaceId: true },
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        // Check if the notification belongs to the workspace
        if (notification.workspaceId !== workspaceId) {
            throw new Error('Notification does not belong to the specified workspace');
        }

        // Check if the user is the owner or has ADMIN/MANAGER role
        if (notification.userId !== userId && !hasAdminOrManagerRole) {
            throw new Error('Unauthorized: You cannot delete this notification');
        }

        // Delete the notification
        await prisma.notification.delete({
            where: { id: notificationId },
        });

        return { message: 'Notification deleted successfully' };
    },

    async createNotification(workspaceId: number, data: z.infer<typeof createNotificationSchema>) {
        const validated = createNotificationSchema.parse(data);

        const [workspace, user] = await Promise.all([
            prisma.workspace.findUnique({ where: { id: workspaceId } }),
            prisma.user.findUnique({ where: { id: validated.userId } }),
        ]);

        if (!workspace) throw new Error('Workspace not found');
        if (!user) throw new Error('User not found');

        return prisma.notification.create({
            data: {
                id: uuid(),
                ...validated,
                workspaceId,
                isRead: false,
            },
        });
    },

    async markNotificationAsRead(workspaceId: number, notificationId: string, userId: string) {
        const exists = await prisma.notification.findFirst({
            where: { id: notificationId, workspaceId, userId },
            select: { id: true },
        });

        if (!exists) throw new Error('Notification not found or unauthorized');

        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    },

    async markAllAsRead(workspaceId: number, userId: string) {
        const result = await prisma.notification.updateMany({
            where: { workspaceId, userId, isRead: false },
            data: { isRead: true },
        });
        return { message: `${result.count} notifications marked as read.` };
    },

    async getUnreadCount(workspaceId: number, userId: string) {
        const count = await prisma.notification.count({
            where: { workspaceId, userId, isRead: false },
        });
        return { count };
    },

    async filter(workspaceId: number, userId: string, filters: any) {
        return prisma.notification.findMany({
            where: {
                workspaceId,
                userId,
                ...filters,
            },
            orderBy: { createdAt: 'desc' },
        });
    },

    async update(workspaceId: number, notificationId: string, data: Partial<z.infer<typeof createNotificationSchema>>) {
        return prisma.notification.update({
            where: { id: notificationId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    },

    async sendToUser(
        workspaceId: number,
        userId: string,
        data: z.infer<typeof createNotificationSchema>,
        io?: SocketIOServer // optional for reusability
    ) {
        const validated = createNotificationSchema.parse({
            ...data,
            userId,
        });

        const notification = await prisma.notification.create({
            data: {
                id: uuid(),
                ...validated,
                workspaceId,
                isRead: false,
            },
        });

        if (io) {
            io.to(userId).emit('receive-notification', {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                createdAt: notification.createdAt,
                workspaceId: notification.workspaceId,
            });

            console.log(`📡 Emitted notification to ${userId}: ${notification.title}`);
        }

        return notification;
    },

    async bulkDelete(workspaceId: number, notificationIds: string[]) {
        const result = await prisma.notification.deleteMany({
            where: {
                id: { in: notificationIds },
                workspaceId,
            },
        });
        return { message: `${result.count} notifications deleted.` };
    },
};

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
});