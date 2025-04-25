import { NotificationType } from "@prisma/client";
import { z } from "zod";

export const createNotificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  title: z.string().min(1, 'Title is required').max(100),
  message: z.string().min(1, 'Message is required').max(500),
  type: z.nativeEnum(NotificationType),
});