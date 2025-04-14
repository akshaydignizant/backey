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
    if (isNaN(workspaceId)) {
      res.status(400).json({ success: false, message: 'Invalid workspaceId' });
    }

    const { email, role } = req.body;
    const userId = req.user?.userId;

    // Validate incoming data
    if (!userId || !email || !role) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Normalize the role to uppercase to ensure it's valid
    const normalizedRole = role.toUpperCase() as Role;

    // Check if the role is valid
    if (!Object.values(Role).includes(normalizedRole)) {
      res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    // Call the service method to invite the user
    const invitation = await workspaceService.inviteUserToWorkspace(
      { email, role: normalizedRole, workspaceId },
      userId as string
    );

    // Generate a temporary password for the user
    const tempPassword = invitation.tempPassword;

    // Create email content (you can use HTML to make the email look better)
    const emailSubject = 'You are invited to join a workspace';
    const emailBody = `
      <p>Hello,</p>
      <p>You have been invited to join a workspace. Your temporary password is:</p>
      <p><strong>${tempPassword}</strong></p>
      <p>Please use this temporary password to log in and update your password.</p>
      <p>Best regards,<br>Backey Management</p>
    `;

    // Send the invitation email with the temporary password
    await sendEmail(email, emailSubject, emailBody);

    // Respond with success message and the invitation data
    res.status(201).json({ success: true, data: invitation });

  } catch (error) {
    // Log the error for debugging purposes
    logger.error('Error inviting user:', error);

    // Respond with a generic error message
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
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
    const { invitetoken } = req.params;

    if (!invitetoken) {
      res.status(400).json({ message: 'Invitation token is required' });
      return;
    }

    const updatedInvitation = await workspaceService.acceptInvitation(invitetoken);

    res.status(200).json({
      message: 'Invitation accepted successfully',
      invitation: updatedInvitation,
    });
  } catch (error: any) {
    logger.error('Error accepting invitation:', error);
    res.status(404).json({ message: error.message || 'Failed to accept invitation' });
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
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.userId;

    if (!userId) {
      res.status(400).json({ success: false, message: 'Missing userId' });
      return;
    }

    const users = await workspaceService.getWorkspaceUsers(workspaceId, userId);

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    // logger.error('Error fetching workspace users:', error);
    res.status(500).json({ success: false, message: error || 'Internal server error' });
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
    console.error('❌ Error revoking invitation:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke invitation' });
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
    console.error('❌ Controller error removing permission:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


