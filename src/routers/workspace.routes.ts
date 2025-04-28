import { Router } from 'express';
import { Role } from '@prisma/client';

import upload from '../config/multerConfig';
import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';

import {
  createWorkspace,
  updateWorkspace,
  inviteUserToWorkspace,
  getWorkspaceUsers,
  acceptInvite,
  assignRolePermission,
  removeUserFromWorkspace,
  getAdminWorkspaces,
  toggleWorkspaceStatus,
  revokeInvitation,
  getRolePermissions,
  removeRolePermission,
  getWorkspacesByUserId,
  exportWorkspaceData,
  searchWorkspaces,
  allDeleteWorkspace,
  deleteWorkspaceById,
  createWorkspaceWithAssignRole
} from '../controllers/workspace.controller';

const router = Router();

/**
 * Workspace CRUD Operations
 */
router.post(
  '/',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  upload.array('images'),
  createWorkspace
);

router.post(
  '/createWorkspace',
  authMiddleware,
  // roleRestriction([Role.CUSTOMER]),
  upload.array('images'),
  createWorkspaceWithAssignRole
);

router.put(
  '/:workspaceId',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  upload.array('images'),
  updateWorkspace
);

router.delete(
  '/',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  allDeleteWorkspace
);

router.delete(
  '/:workspaceId',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  deleteWorkspaceById
);

router.patch(
  '/:workspaceId/status',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  toggleWorkspaceStatus
);

/**
 * Workspace Queries
 */
router.get(
  '/',
  authMiddleware,
  // roleRestriction([Role.ADMIN, Role.MANAGER, Role.CUSTOMER]),
  searchWorkspaces
);

router.get(
  '/admin',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  getAdminWorkspaces
);

router.get(
  '/user/:userId/workspaces',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  getWorkspacesByUserId
);

router.get(
  '/:workspaceId/export',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  exportWorkspaceData
);

/**
 * User Management in Workspace
 */
router.get(
  '/:workspaceId/users',
  authMiddleware,
  getWorkspaceUsers
);

router.post(
  '/:workspaceId/invite',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  inviteUserToWorkspace
);

router.get(
  '/invitation/accept/:invitetoken',
  acceptInvite
);

router.delete(
  '/:workspaceId/removeUser',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  removeUserFromWorkspace
);

router.patch(
  '/invitations/:invitationId',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  revokeInvitation
);

/**
 * Role & Permission Management
 */
router.post(
  '/:workspaceId/assignRolePermission',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  assignRolePermission
);

router.get(
  '/:workspaceId/roles/:role/permissions',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  getRolePermissions
);

router.delete(
  '/:workspaceId/roles/:role/permissions',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  removeRolePermission
);

export default router;
