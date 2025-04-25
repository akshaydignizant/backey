import { z } from 'zod';
import { NotificationType } from '@prisma/client';

export const querySchema = z.object({
  limit: z.string().optional().default('50').transform(Number).refine((val) => val > 0 && val <= 100, {
    message: 'Limit must be between 1 and 100',
  }),
  offset: z.string().optional().default('0').transform(Number).refine((val) => val >= 0, {
    message: 'Offset must be non-negative',
  }),
  type: z.enum(['LOW_STOCK', 'ORDER_UPDATE', 'INVITATION', 'SYSTEM']).optional(),
  isRead: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
});


export const bulkDeleteSchema = z.object({
  notificationIds: z.array(z.string().uuid()),
});

export const optionsSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  type: z.nativeEnum(NotificationType).optional(),
  isRead: z.boolean().optional(),
}).strict();

export const createNotificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  title: z.string().min(1, 'Title is required').max(100),
  message: z.string().min(1, 'Message is required').max(500),
  type: z.nativeEnum(NotificationType),
});