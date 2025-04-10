import { Router } from 'express';
import { createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, inviteUserToWorkspace, getWorkspaceUsers, createBoard, addUserToBoard } from '../controllers/workspace.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Workspace Operations
router.post('/', authMiddleware, createWorkspace);
router.get('/:workspaceId', authMiddleware, getWorkspace);
router.put('/:workspaceId', authMiddleware, updateWorkspace);
router.delete('/:workspaceId', authMiddleware, deleteWorkspace);
router.post('/:workspaceId/invite', authMiddleware, inviteUserToWorkspace);
router.get('/:workspaceId/users', authMiddleware, getWorkspaceUsers);

// Board Operations
router.post('/:workspaceId/boards', authMiddleware, createBoard);
router.post('/boards/:boardId/users', authMiddleware, addUserToBoard);

export default router;