import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';
import { Role } from '@prisma/client';
import {
    getNotifications,
    createNotification,
    markNotificationAsRead,
    deleteNotification,
} from '../controllers/notification.controller';

const router = Router();

// Notification Routes
router.get('/:workspaceId/notifications', authMiddleware, getNotifications);
router.post('/:workspaceId/notifications', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createNotification);
router.put('/:workspaceId/notifications/:notificationId/read', authMiddleware, markNotificationAsRead);
router.delete('/:workspaceId/notifications/:notificationId', authMiddleware, deleteNotification);

export default router;