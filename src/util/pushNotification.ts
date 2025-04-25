// utils/notification.ts
import { Server as SocketIOServer } from 'socket.io';
import { notificationService } from '../services/notification.service'; // adjust path
import { z } from 'zod';
import { createNotificationSchema } from '../validators/notification'; // adjust path
// import { notificationService } from '../services/notification.service';
export const sendNotificationToUsers = async (
  workspaceId: number,
  userIds: string[],
  notificationData: z.infer<typeof createNotificationSchema>,
  io?: SocketIOServer
) => {
  const results = [];

  for (const userId of userIds) {
    const result = await notificationService.sendToUser(
      workspaceId,
      userId,
      {
        ...notificationData,
        userId, // inject the current userId
      },
      io
    );
    results.push(result);
  }

  return results;
};
