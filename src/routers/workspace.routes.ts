import { Router } from 'express';
import { createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, inviteUserToWorkspace, getWorkspaceUsers, acceptInvite, assignRolePermission, removeUserFromWorkspace, getAdminWorkspaces, toggleWorkspaceStatus, revokeInvitation, getRolePermissions, removeRolePermission, getWorkspacesByUserId, exportWorkspaceData } from '../controllers/workspace.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';
import { Role } from '@prisma/client';

const router = Router();

// Workspace Operations
router.post('/', authMiddleware, createWorkspace);
router.get('/admin', authMiddleware, roleRestriction([Role.ADMIN]), getAdminWorkspaces); // Get all workspaces for admin
router.get('/', authMiddleware, getWorkspace);
router.get('/user/:userId/workspaces', authMiddleware, getWorkspacesByUserId); // Get all workspaces of particular user
router.put('/:workspaceId', authMiddleware, roleRestriction([Role.ADMIN]), updateWorkspace);
router.delete('/:workspaceId', authMiddleware, roleRestriction([Role.ADMIN]), deleteWorkspace);
router.post('/:workspaceId/invite', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), inviteUserToWorkspace);
router.get('/invitation/accept/:invitetoken', acceptInvite);
router.delete('/:workspaceId/removeUser', authMiddleware, roleRestriction([Role.ADMIN]), removeUserFromWorkspace);
router.post('/:workspaceId/assignRolePermission', authMiddleware, roleRestriction([Role.ADMIN]), assignRolePermission);
router.get('/:workspaceId/users', authMiddleware, getWorkspaceUsers);


router.patch('/:workspaceId/status', authMiddleware, roleRestriction([Role.ADMIN]), toggleWorkspaceStatus);

router.patch('/invitations/:invitationId', authMiddleware, roleRestriction([Role.ADMIN]), revokeInvitation);


router.get('/:workspaceId/roles/:role/permissions', authMiddleware, getRolePermissions);
router.delete('/:workspaceId/roles/:role/permissions', authMiddleware, roleRestriction([Role.ADMIN]), removeRolePermission);

router.get('/:workspaceId/export', authMiddleware, roleRestriction([Role.ADMIN]), exportWorkspaceData);

export default router;