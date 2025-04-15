import { NextFunction, Request, Response } from 'express';
import { workspaceService } from '../services/workspace.service';
import logger from '../util/logger';
import { Role } from '@prisma/client';
import sendEmail from '../util/sendEmail';
import { AdminWorkspaceResponse } from '../models/types';
import httpError from '../util/httpError';
import httpResponse from '../util/httpResponse';

// Create Workspace
export const createWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { name, description, images, openingTime, closingTime, isActive } = req.body;

    if (!name) {
      return httpResponse(req, res, 400, 'Workspace name is required');
    }

    const workspace = await workspaceService.createWorkspace(userId as string, {
      name,
      description,
      images,
      openingTime,
      closingTime,
      isActive,
    });

    return httpResponse(req, res, 201, 'Workspace created successfully', workspace);
  } catch (error) {
    logger.error('Error creating workspace:', error);
    return httpError(next, error, req);
  }
};

// Get Workspace
export const getWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, page = '1', limit = '10' } = req.query;
    const userId = req.user?.userId;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);

    if (isNaN(pageNumber) || isNaN(limitNumber)) {
      return httpResponse(req, res, 400, 'Invalid pagination values');
    }

    const results = await workspaceService.getWorkspace({
      search: search as string,
      page: pageNumber,
      limit: limitNumber,
    });
    return httpResponse(req, res, 200, 'Workspaces fetched successfully', results.data);
  } catch (error) {
    logger.error('Error fetching workspace:', error);
    return httpError(next, error, req);
  }
};

export const getWorkspacesByUserId = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ success: false, message: 'Invalid or missing userId' });
    return;
  }

  try {
    const workspaces = await workspaceService.getWorkspacesByUserId(userId);

    if (!workspaces || workspaces.length === 0) {
      res.status(404).json({ success: false, message: 'No workspaces found for this user' });
      return;
    }

    res.status(200).json({ success: true, data: workspaces });
  } catch (error: any) {
    console.error(`Workspace fetch error for user ${userId}:`, error.message);
    res.status(500).json({ success: false, message: 'Something went wrong while fetching workspaces' });
  }
};



// Update Workspace
export const updateWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const { name, description, isActive } = req.body;
    const userId = req.user?.userId;
    const workspace = await workspaceService.updateWorkspace(workspaceId, userId as string, {
      name,
      description,
      isActive,
    });
    httpResponse(req, res, 200, 'Workspace updated successfully', workspace);
  } catch (error) {
    logger.error('Error updating workspace:', error);
    return httpError(next, error, req);
  }
};

// Remove User From Workspace
export const removeUserFromWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    if (isNaN(workspaceId)) {
      return httpResponse(req, res, 400, 'Invalid workspaceId');
    }

    const { email } = req.body;
    const currentUserId = req.user?.userId;
    const currentUserRole = req.user?.role;

    if (!email || !currentUserId || !currentUserRole) {
      httpResponse(req, res, 400, 'Missing required fields');
    }

    const removed = await workspaceService.removeUserFromWorkspace(workspaceId, email, currentUserId as string, currentUserRole as Role);

    httpResponse(req, res, 200, 'User removed from workspace successfully', removed);
  } catch (error) {
    logger.error('Error removing user from workspace:', error);
    return httpError(next, error, req);
  }
};

// Delete Workspace
export const deleteWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.userId;
    await workspaceService.deleteWorkspace(workspaceId, userId as string);
    httpResponse(req, res, 204, 'Workspace deleted successfully');
  } catch (error) {
    logger.error('Error deleting workspace:', error);
    return httpError(next, error, req);
  }
};


export const getAdminWorkspaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const workspaces = await workspaceService.getAdminWorkspaces(userId as string);

    res.status(200).json({
      success: true,
      data: workspaces,
      message: 'Admin workspaces retrieved successfully',
    });
  } catch (error: any) {
    console.error('❌ Error in getAdminWorkspaces controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// Invite User
export const inviteUserToWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const { email, role } = req.body;
    const userId = req.user?.userId;

    if (!workspaceId || !email || !role || !userId) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const normalizedRole = role.toUpperCase() as Role;
    if (!Object.values(Role).includes(normalizedRole)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    const invitation = await workspaceService.inviteUserToWorkspace(
      { email, role: normalizedRole, workspaceId },
      userId
    );

    if (!invitation) {
      res.status(200).json({ success: false, message: 'User is already part of the workspace' });
      return;
    }
    res.status(201).json({ success: true, data: { message: "invitation sent" } });

  } catch (error) {
    logger.error('Error inviting user:', {
      error: error instanceof Error ? error.message : error,
      workspaceId: req.params.workspaceId,
      invitedBy: req.user?.userId,
      email: req.body.email,
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
};

// Accept Invitation
export const acceptInvite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const inviteToken = req.params.invitetoken;

    // Validate token
    if (!inviteToken) {
      res.status(400).json({ success: false, message: 'Invitation token is required' });
      return;
    }

    // Call the service to accept the invitation
    const updatedWorkspace = await workspaceService.acceptInvitation(inviteToken);

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      // data: updatedWorkspace,
    });

  } catch (error: any) {
    logger.error('Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept invitation',
    });
  }
};

export const setRolePermission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { workspaceId, role, permission } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Validation
    if (!workspaceId || !role || !permission || !userId) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    // Normalize & validate role
    const normalizedRole = role.toUpperCase() as Role;
    if (!Object.values(Role).includes(normalizedRole)) {
      res.status(400).json({ success: false, message: 'Invalid role provided' });
      return;
    }

    // Only admins can assign roles
    if (userRole !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Access denied: Admins only' });
      return;
    }

    const result = await workspaceService.setRolesPermissionService(
      Number(workspaceId),
      normalizedRole,
      permission,
      userId
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error assigning permission:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
};

export const assignRolePermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);

    if (isNaN(workspaceId)) {
      res.status(400).json({ success: false, message: 'Invalid workspaceId' });
      return;
    }

    const { role, permissions } = req.body;

    if (!role || !Array.isArray(permissions) || permissions.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Role and permissions are required and must be valid',
      });
      return;
    }

    const upperRole = role.toUpperCase() as Role;

    // Loop over the permissions array and assign each one
    for (const permission of permissions) {
      await workspaceService.setRolesPermissionService(workspaceId, upperRole, permission, req.user?.userId as string);
    }

    res.status(200).json({
      success: true,
      message: 'Permissions assigned to role successfully',
    });
  } catch (error) {
    console.error('❌ Error assigning role permission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// Get Workspace Users
export const getWorkspaceUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const userId = req.user?.userId;

    if (!userId || isNaN(workspaceId)) {
      res.status(400).json({ success: false, message: 'Invalid request parameters' });
      return;
    }

    const users = await workspaceService.getWorkspaceUsers(workspaceId, userId);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message || 'Internal server error' });
  }
};

export const toggleWorkspaceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    if (isNaN(workspaceId)) {
      res.status(400).json({ success: false, message: 'Invalid workspaceId' });
    }

    const updatedStatus = await workspaceService.toggleWorkspaceStatus(workspaceId);

    res.status(200).json({
      success: true,
      message: `Workspace status updated`,
      data: {
        workspaceId,
        isActive: updatedStatus,
      },
    });
  } catch (error: any) {
    console.error('❌ Error toggling workspace status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


export const revokeInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const invitationId = parseInt(req.params.invitationId);

    if (isNaN(invitationId)) {
      res.status(400).json({ success: false, message: 'Invalid invitationId' });
      return;
    }

    await workspaceService.revokeInvitation(invitationId);

    res.status(200).json({ success: true, message: 'Invitation revoked successfully' });
  } catch (error: any) {
    console.error('❌ Error revoking invitation:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to revoke invitation' });
  }
};
export const getRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const role = req.params.role.toUpperCase() as Role;

    if (isNaN(workspaceId) || !role) {
      res.status(400).json({ success: false, message: 'Invalid workspaceId or role' });
      return;
    }

    const permissions = await workspaceService.getRolePermissions(workspaceId, role);

    res.status(200).json({
      success: true,
      data: permissions,
      message: 'Permissions fetched successfully',
    });
  } catch (error: any) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch role permissions' });
  }
};
export const removeRolePermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const role = req.params.role.toUpperCase() as Role;
    const { permission } = req.body;

    if (!workspaceId || !role || !permission) {
      res.status(400).json({ success: false, message: 'Missing fields' });
    }

    await workspaceService.removeRolePermission(workspaceId, role, permission);

    res.status(200).json({ success: true, message: 'Permission removed successfully' });
  } catch (error) {
    console.error('Controller error removing permission:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const exportWorkspaceData = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);

    if (!workspaceId) {
      res.status(400).json({ success: false, message: 'Missing workspaceId' });
      return;
    }
    const userPage = parseInt(req.query.userPage as string) || 1;
    const userPageSize = parseInt(req.query.userPageSize as string) || 10;
    const invitationPage = parseInt(req.query.invitationPage as string) || 1;
    const invitationPageSize = parseInt(req.query.invitationPageSize as string) || 10;

    const data = await workspaceService.exportWorkspaceData(
      workspaceId,
      userPage,
      userPageSize,
      invitationPage,
      invitationPageSize
    );

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error exporting workspace data:', error);
    res.status(500).json({ success: false, message: 'Failed to export workspace data' });
  }
};
