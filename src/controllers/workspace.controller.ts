import { NextFunction, Request, Response } from 'express';
import { workspaceService } from '../services/workspace.service';
import logger from '../util/logger';
import { WorkspaceResponse } from '../models/types';

// Create Workspace
export const createWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(400).json({ success: false, message: 'Missing userId' });
    }

    const workspace = await workspaceService.createWorkspace(userId as string, req.body);
    res.status(201).json({ success: true, data: workspace });
  } catch (error) {
    logger.error('Error creating workspace:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get Workspace
export const getWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.userId;

    if (!userId)
      res.status(400).json({ success: false, message: 'Missing userId' });

    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (!workspace)
      res.status(404).json({ success: false, message: 'Workspace not found' });

    res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update Workspace
export const updateWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const { ...data } = req.body;
    const userId = req.user?.userId;
    if (!userId)
      res.status(400).json({ success: false, message: 'Missing userId' });

    const workspace = await workspaceService.updateWorkspace(workspaceId, userId as string, data);
    res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    res.status(500).json({ success: false, message: error || 'Internal server error' });
  }
};

// Delete Workspace
export const deleteWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.userId;

    if (!userId)
      res.status(400).json({ success: false, message: 'Missing userId' });

    await workspaceService.deleteWorkspace(workspaceId, userId as string);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ success: false, message: error || 'Internal server error' });
  }
};

// Invite User
export const inviteUserToWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    if (isNaN(workspaceId)) {
      res.status(400).json({ success: false, message: 'Invalid workspaceId' });
    }

    const { email, role, boardId } = req.body;
    const userId = req.user?.userId;

    if (!userId || !email || !role || !boardId) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const invitation = await workspaceService.inviteUserToWorkspace(
      {
        email,
        role,
        boardId: Number(boardId),
        workspaceId,
      },
      userId as string
    );

    res.status(201).json({ success: true, data: invitation });
  } catch (error) {
    logger.error('Error inviting user:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
};

export const acceptInvite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invitetoken } = req.params;

    if (!invitetoken) {
      res.status(400).json({ message: 'Invitation token is required' });
    }

    const updatedInvitation = await workspaceService.acceptInvitation(invitetoken);

    res.status(200).json({
      message: 'Invitation accepted successfully',
      invitation: updatedInvitation,
    });
  } catch (error: any) {
    res.status(404).json({ message: error.message || 'Failed to accept invitation' });
  }
};
// Get Workspace Users
export const getWorkspaceUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.workspaceId);
    const userId = req.user?.userId;

    if (!userId)
      res.status(400).json({ success: false, message: 'Missing userId' });

    const users = await workspaceService.getWorkspaceUsers(id, userId as string);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    logger.error('Error fetching workspace users:', error);
    res.status(500).json({ success: false, message: error || 'Internal server error' });
  }
};

// Create Board
export const createBoard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const { ...data } = req.body;
    const userId = req.user?.userId;
    if (!userId)
      res.status(400).json({ success: false, message: 'Missing userId' });

    const board = await workspaceService.createBoard(workspaceId, userId as string, data);
    res.status(201).json({ success: true, data: board });
  } catch (error) {
    res.status(500).json({ success: false, message: error || 'Internal server error' });
  }
};

// Add User to Board
export const addUserToBoard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const boardId = parseInt(req.params.boardId);
    const { newUserId, role } = req.body;
    const userId = req.user?.userId;
    if (!userId || !newUserId || !role) {

      res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const boardUser = await workspaceService.addUserToBoard(boardId, userId as string, newUserId, role);
    res.status(201).json({ success: true, data: boardUser });
  } catch (error) {
    logger.error('Error adding user to board:', error);
    res.status(500).json({ success: false, message: error || 'Internal server error' });
  }
};
