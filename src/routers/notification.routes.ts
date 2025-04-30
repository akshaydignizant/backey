import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';
import { Role } from '@prisma/client';
import {
    getNotifications,
    createNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationsCount,
    filterNotifications,
    updateNotification,
    sendNotificationToUser,
    bulkDeleteNotifications,
    deleteNotification,
} from '../controllers/notification.controller';

const router = Router();

router.get('/', authMiddleware, getNotifications);
router.post('/:workspaceId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createNotification);
router.put('/:workspaceId/:notificationId/read', authMiddleware, markNotificationAsRead);
router.put('/:workspaceId/mark-all-read', authMiddleware, markAllNotificationsAsRead);
router.get('/:workspaceId/unread/count', authMiddleware, getUnreadNotificationsCount);
router.get('/:workspaceId/filter', authMiddleware, filterNotifications);
router.put('/:workspaceId/:notificationId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateNotification);
router.post('/:workspaceId/user', authMiddleware, roleRestriction([Role.ADMIN]), sendNotificationToUser);
router.post('/:workspaceId/bulk-delete', authMiddleware, roleRestriction([Role.ADMIN]), bulkDeleteNotifications);
router.delete('/:workspaceId/:notificationId', authMiddleware, deleteNotification);

export default router;
