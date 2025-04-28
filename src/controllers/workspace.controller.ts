// import { NextFunction, Request, Response } from 'express';
// import { workspaceService } from '../services/workspace.service';
// import logger from '../util/logger';
// import { Role } from '@prisma/client';
// import sendEmail from '../util/sendEmail';
// import { AdminWorkspaceResponse } from '../models/types';
// import httpError from '../util/httpError';
// import httpResponse from '../util/httpResponse';

// // Create Workspace
// export const createWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     const userId = req.user?.userId;
//     const { name, description, openingTime, closingTime, isActive } = req.body;
//     const images = req.files ? (req.files as Express.Multer.File[]).map((file) => file.path) : [];
//     if (!name) {
//       return httpResponse(req, res, 400, 'Workspace name is required');
//     }

//     const workspace = await workspaceService.createWorkspace(userId as string, {
//       name,
//       description,
//       images: images,
//       openingTime,
//       closingTime,
//       isActive,
//     });
//     return httpResponse(req, res, 201, 'Workspace created successfully', workspace);
//   } catch (error) {
//     logger.error('Error creating workspace:', error);
//     return httpError(next, error, req);
//   }
// };

// // Get Workspace
// export const searchWorkspaces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     const { search, page = '1', limit = '10' } = req.query;
//     const pageNumber = parseInt(page as string);
//     const limitNumber = parseInt(limit as string);

//     if (isNaN(pageNumber) || isNaN(limitNumber)) {
//       return httpResponse(req, res, 400, 'Invalid pagination values');
//     }

//     const results = await workspaceService.getWorkspace({
//       search: search as string,
//       page: pageNumber,
//       limit: limitNumber,
//     });
//     httpResponse(req, res, 200, 'Workspaces fetched successfully', results.data);
//   } catch (error) {
//     logger.error('Error fetching workspace:', error);
//     return httpError(next, error, req);
//   }
// };

// export const getWorkspacesByUserId = async (req: Request, res: Response): Promise<void> => {
//   const { userId } = req.params;

//   if (!userId || typeof userId !== 'string') {
//     res.status(400).json({ success: false, message: 'Invalid or missing userId' });
//     return;
//   }

//   try {
//     const workspaces = await workspaceService.getWorkspacesByUserId(userId);

//     if (!workspaces || workspaces.length === 0) {
//       res.status(404).json({ success: false, message: 'No workspaces found for this user' });
//       return;
//     }

//     res.status(200).json({ success: true, data: workspaces });
//   } catch (error: any) {
//     console.error(`Workspace fetch error for user ${userId}:`, error.message);
//     res.status(500).json({ success: false, message: 'Something went wrong while fetching workspaces' });
//   }
// };



// // Update Workspace
// export const updateWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     const workspaceId = parseInt(req.params.workspaceId);
//     const userId = req.user?.userId;

//     if (isNaN(workspaceId) || !userId) {
//       return httpResponse(req, res, 400, 'Invalid workspace ID or user');
//     }

//     const { name, description, isActive } = req.body;

//     const data: any = {};
//     if (name !== undefined) data.name = name;
//     if (description !== undefined) data.description = description;
//     if (isActive !== undefined) data.isActive = isActive;

//     // Optional: handle uploaded images (e.g., logo or banners)
//     const images = req.files ? (req.files as Express.Multer.File[]).map((file) => file.path) : [];
//     if (images.length) {
//       data.images = images; // assumes your model supports an "images" field
//     }

//     const workspace = await workspaceService.updateWorkspace(workspaceId, userId, data);

//     return httpResponse(req, res, 200, 'Workspace updated successfully', workspace);
//   } catch (error) {
//     logger.error('Error updating workspace:', error);
//     return httpError(next, error, req);
//   }
// };

// // Remove User From Workspace
// export const removeUserFromWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     const workspaceId = parseInt(req.params.workspaceId);
//     if (isNaN(workspaceId)) {
//       return httpResponse(req, res, 400, 'Invalid workspaceId');
//     }

//     const { email } = req.body;
//     const currentUserId = req.user?.userId;
//     const currentUserRole = req.user?.role;

//     if (!email || !currentUserId || !currentUserRole) {
//       httpResponse(req, res, 400, 'Missing required fields');
//     }

//     const removed = await workspaceService.removeUserFromWorkspace(workspaceId, email, currentUserId as string, currentUserRole as Role);

//     httpResponse(req, res, 200, 'User removed from workspace successfully', removed);
//   } catch (error) {
//     logger.error('Error removing user from workspace:', error);
//     return httpError(next, error, req);
//   }
// };

// // Delete Workspace
// export const allDeleteWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     const workspaceIds: number[] = req.body.workspaceIds;
//     const userId = req.user?.userId;

//     if (!userId) {
//       return httpError(next, new Error('Unauthorized: missing user ID'), req);
//     }

//     if (!Array.isArray(workspaceIds) || workspaceIds.length === 0) {
//       return httpResponse(req, res, 400, 'No workspace IDs provided.', null);
//     }

//     await workspaceService.deleteWorkspaces(workspaceIds, userId);

//     return httpResponse(req, res, 200, 'Workspaces deleted successfully');
//   } catch (error) {
//     logger.error('Error deleting workspaces:', error);
//     return httpError(next, error, req);
//   }
// };

// export const deleteWorkspaceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     const workspaceId = parseInt(req.params.workspaceId);
//     const userId = req.user?.userId;

//     if (!userId) {
//       return httpError(next, new Error('Unauthorized: missing user ID'), req);
//     }

//     if (isNaN(workspaceId)) {
//       return httpResponse(req, res, 400, 'Invalid workspace ID.');
//     }

//     await workspaceService.deleteWorkspaceById(workspaceId, userId);

//     return httpResponse(req, res, 200, 'Workspace deleted successfully.');
//   } catch (error) {
//     logger.error('Error deleting workspace by ID:', error);
//     return httpError(next, error, req);
//   }
// };



// export const getAdminWorkspaces = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user?.userId;
//     const workspaces = await workspaceService.getAdminWorkspaces(userId as string);
//     res.status(200).json({
//       success: true,
//       data: workspaces,
//       message: 'Admin workspaces retrieved successfully',
//     });
//   } catch (error: any) {
//     console.error('❌ Error in getAdminWorkspaces controller:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Internal server error',
//     });
//   }
// };

// // Invite User
// export const inviteUserToWorkspace = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   const workspaceId = Number(req.params.workspaceId);
//   const { email, role } = req.body;
//   const { userId } = req.user || {};

//   if (!userId || !workspaceId || !email || !role) {
//     return httpResponse(req, res, 400, 'Missing required fields');
//   }

//   const normalizedRole = role.toUpperCase() as Role;
//   if (!Object.values(Role).includes(normalizedRole)) {
//     return httpResponse(req, res, 400, 'Invalid role');
//   }

//   try {
//     const invitation = await workspaceService.inviteUserToWorkspace(
//       { email, role: normalizedRole, workspaceId },
//       userId
//     );
//     return invitation
//       ? httpResponse(req, res, 201, 'Invitation sent', { invitation })
//       : httpResponse(req, res, 200, 'User is already part of the workspace');
//   } catch (error) {
//     return httpError(next, error, req);
//   }
// };

// // Accept Invitation
// export const acceptInvite = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   const { invitetoken: inviteToken } = req.params;

//   if (!inviteToken) {
//     return httpResponse(req, res, 400, 'Invitation token is required');
//   }

//   try {
//     await workspaceService.acceptInvitation(inviteToken);
//     return httpResponse(req, res, 200, 'Invitation accepted successfully');
//   } catch (error) {
//     return httpError(next, error, req);
//   }
// };

// export const setRolePermission = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { workspaceId, role, permission } = req.body;
//     const userId = req.user?.userId;
//     const userRole = req.user?.role;

//     // Validation
//     if (!workspaceId || !role || !permission || !userId) {
//       res.status(400).json({ success: false, message: 'Missing required fields' });
//       return;
//     }

//     // Normalize & validate role
//     const normalizedRole = role.toUpperCase() as Role;
//     if (!Object.values(Role).includes(normalizedRole)) {
//       res.status(400).json({ success: false, message: 'Invalid role provided' });
//       return;
//     }

//     // Only admins can assign roles
//     if (userRole !== 'ADMIN') {
//       res.status(403).json({ success: false, message: 'Access denied: Admins only' });
//       return;
//     }

//     const result = await workspaceService.setRolesPermissionService(
//       Number(workspaceId),
//       normalizedRole,
//       permission,
//       userId
//     );

//     res.status(200).json({ success: true, data: result });
//   } catch (error) {
//     console.error('❌ Error assigning permission:', error);
//     res.status(500).json({
//       success: false,
//       message: error instanceof Error ? error.message : 'Internal server error',
//     });
//   }
// };

// export const assignRolePermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   {
//     const workspaceId = Number(req.params.workspaceId);
//     const { role, permissions } = req.body;
//     const { userId } = req.user || {};

//     if (isNaN(workspaceId) || !userId || !role || !Array.isArray(permissions) || !permissions.length) {
//       return httpResponse(req, res, 400, 'Invalid workspace ID, user ID, role, or permissions');
//     }

//     const upperRole = role.toUpperCase() as Role;
//     if (!Object.values(Role).includes(upperRole)) {
//       return httpResponse(req, res, 400, 'Invalid role');
//     }

//     try {
//       await workspaceService.setRolesPermissionService(workspaceId, upperRole, permissions, userId);
//       return httpResponse(req, res, 200, 'Permissions assigned to role successfully');
//     } catch (error) {
//       return httpError(next, error, req);
//     }
//   }
// };


// // Get Workspace Users
// export const getWorkspaceUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     const workspaceId = Number(req.params.workspaceId);
//     const userId = req.user?.userId;

//     if (!userId || isNaN(workspaceId)) {
//       res.status(400).json({ success: false, message: 'Invalid request parameters' });
//       return;
//     }

//     const users = await workspaceService.getWorkspaceUsers(workspaceId, userId);
//     res.status(200).json({ success: true, data: users });
//   } catch (error) {
//     res.status(500).json({ success: false, message: (error as Error).message || 'Internal server error' });
//   }
// };

// export const toggleWorkspaceStatus = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const workspaceId = parseInt(req.params.workspaceId);
//     if (isNaN(workspaceId)) {
//       res.status(400).json({ success: false, message: 'Invalid workspaceId' });
//     }

//     const updatedStatus = await workspaceService.toggleWorkspaceStatus(workspaceId);

//     res.status(200).json({
//       success: true,
//       message: `Workspace status updated`,
//       data: {
//         workspaceId,
//         isActive: updatedStatus,
//       },
//     });
//   } catch (error: any) {
//     console.error('❌ Error toggling workspace status:', error);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// };


// export const revokeInvitation = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const invitationId = parseInt(req.params.invitationId);

//     if (isNaN(invitationId)) {
//       res.status(400).json({ success: false, message: 'Invalid invitationId' });
//       return;
//     }

//     await workspaceService.revokeInvitation(invitationId);

//     res.status(200).json({ success: true, message: 'Invitation revoked successfully' });
//   } catch (error: any) {
//     console.error('❌ Error revoking invitation:', error.message);
//     res.status(500).json({ success: false, message: error.message || 'Failed to revoke invitation' });
//   }
// };
// export const getRolePermissions = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const workspaceId = parseInt(req.params.workspaceId);
//     const role = req.params.role.toUpperCase() as Role;

//     if (isNaN(workspaceId) || !role) {
//       res.status(400).json({ success: false, message: 'Invalid workspaceId or role' });
//       return;
//     }

//     const permissions = await workspaceService.getRolePermissions(workspaceId, role);

//     res.status(200).json({
//       success: true,
//       data: permissions,
//       message: 'Permissions fetched successfully',
//     });
//   } catch (error: any) {
//     console.error('Error fetching role permissions:', error);
//     res.status(500).json({ success: false, message: 'Failed to fetch role permissions' });
//   }
// };
// export const removeRolePermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   const workspaceId = Number(req.params.workspaceId);
//   const role = req.params.role?.toUpperCase() as Role;
//   const { permission } = req.body;
//   const { userId } = req.user || {};

//   if (isNaN(workspaceId) || !role || !permission || !userId) {
//     return httpResponse(req, res, 400, 'Invalid workspace ID, role, permission, or user ID');
//   }

//   if (!Object.values(Role).includes(role)) {
//     return httpResponse(req, res, 400, 'Invalid role');
//   }

//   try {
//     await workspaceService.removeRolePermission(workspaceId, role, permission, userId);
//     return httpResponse(req, res, 200, 'Permission removed successfully');
//   } catch (error) {
//     return httpError(next, error, req);
//   }
// };

// export const exportWorkspaceData = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const workspaceId = parseInt(req.params.workspaceId);

//     if (!workspaceId) {
//       res.status(400).json({ success: false, message: 'Missing workspaceId' });
//       return;
//     }
//     const userPage = parseInt(req.query.userPage as string) || 1;
//     const userPageSize = parseInt(req.query.userPageSize as string) || 10;
//     const invitationPage = parseInt(req.query.invitationPage as string) || 1;
//     const invitationPageSize = parseInt(req.query.invitationPageSize as string) || 10;

//     const data = await workspaceService.exportWorkspaceData(
//       workspaceId,
//       userPage,
//       userPageSize,
//       invitationPage,
//       invitationPageSize
//     );

//     res.status(200).json({ success: true, data });
//   } catch (error: any) {
//     console.error('❌ Error exporting workspace data:', error);
//     res.status(500).json({ success: false, message: 'Failed to export workspace data' });
//   }
// };

import { NextFunction, Request, Response } from 'express';
import { workspaceService } from '../services/workspace.service';
import logger from '../util/logger';
import { Role } from '@prisma/client';
import sendEmail from '../util/sendEmail';
import httpError from '../util/httpError';
import httpResponse from '../util/httpResponse';

// Create Workspace
export const createWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { name, description, openingTime, closingTime, isActive } = req.body;
    const images = req.files ? (req.files as Express.Multer.File[]).map((file) => file.path) : [];

    if (!userId) {
      return httpResponse(req, res, 401, 'Unauthorized: Missing user ID.', null);
    }
    if (!name) {
      return httpResponse(req, res, 400, 'Workspace name is required.', null);
    }

    const workspace = await workspaceService.createWorkspace(userId, {
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
export const searchWorkspaces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, page = '1', limit = '10' } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);

    if (isNaN(pageNumber) || isNaN(limitNumber)) {
      return httpResponse(req, res, 400, 'Invalid pagination values.', null);
    }

    const results = await workspaceService.getWorkspace({
      search: search as string,
      page: pageNumber,
      limit: limitNumber,
    });
    httpResponse(req, res, 200, 'Workspaces fetched successfully', results.data);
  } catch (error) {
    logger.error('Error fetching workspace:', error);
    return httpError(next, error, req);
  }
};

export const getWorkspacesByUserId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      return httpResponse(req, res, 400, 'Invalid or missing userId.', null);
    }

    const workspaces = await workspaceService.getWorkspacesByUserId(userId);

    if (!workspaces || workspaces.length === 0) {
      return httpResponse(req, res, 404, 'No workspaces found for this user.', null);
    }

    httpResponse(req, res, 200, 'Workspaces fetched successfully', workspaces);
  } catch (error) {
    logger.error(`Workspace fetch error for user ${req.params.userId}:`, error);
    return httpError(next, error, req);
  }
};

export const createWorkspaceWithAssignRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { name, description, openingTime, closingTime, isActive } = req.body;
    const images = req.files ? (req.files as Express.Multer.File[]).map((file) => file.path) : [];

    if (!userId) {
      return httpResponse(req, res, 401, 'Unauthorized: Missing user ID.', null);
    }
    if (!name) {
      return httpResponse(req, res, 400, 'Workspace name is required.', null);
    }

    const workspaceData = await workspaceService.createWorkspaceWithAssignRole(userId, {
      name,
      description,
      images,
      openingTime,
      closingTime,
      isActive,
    });

    // Send the response with workspace ID, email, and roles
    return httpResponse(req, res, 201, 'Workspace created successfully', workspaceData);
  } catch (error) {
    logger.error('Error creating workspace:', error);
    return httpError(next, error, req);
  }
};

// Update Workspace
export const updateWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const userId = req.user?.userId;

    if (isNaN(workspaceId)) {
      return httpResponse(req, res, 400, 'Invalid workspace ID.', null);
    }

    if (!userId) {
      return httpResponse(req, res, 401, 'Unauthorized: Missing user information.', null);
    }

    const normalizeField = (val: any) =>
      val === 'null' || val === undefined || val === '' ? null : val;

    const { name, description, isActive, openingTime, closingTime, locationId } = req.body;

    const data: any = {
      ...(name && { name }),
      ...(description && { description }),
      ...(typeof isActive !== 'undefined' && { isActive: isActive === 'true' || isActive === true }),
      openingTime: normalizeField(openingTime),
      closingTime: normalizeField(closingTime),
      locationId: normalizeField(locationId),
    };

    const images = (req.files as Express.Multer.File[])?.map((file) => file.path) || [];
    if (images.length > 0) {
      data.images = images;
    }

    const workspace = await workspaceService.updateWorkspace(workspaceId, userId, data);

    return httpResponse(req, res, 200, 'Workspace updated successfully', workspace);
  } catch (error) {
    logger.error('Error updating workspace:', error);
    return httpError(next, error, req);
  }
};


// Remove User From Workspace
export const removeUserFromWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const { email } = req.body;
    const currentUserId = req.user?.userId;
    const currentUserRoles = req.user?.roles;

    if (isNaN(workspaceId)) {
      return httpResponse(req, res, 400, 'Invalid workspaceId.', null);
    }
    if (!email || !currentUserId || !currentUserRoles) {
      return httpResponse(req, res, 400, 'Missing required fields.', null);
    }
    // if (!currentUserRoles.includes(Role.ADMIN) && !currentUserRoles.includes(Role.MANAGER)) {
    //   return httpResponse(req, res, 403, 'Only admins or managers can remove users.', null);
    // }

    const removed = await workspaceService.removeUserFromWorkspace(workspaceId, email, currentUserId);

    httpResponse(req, res, 200, 'User removed from workspace successfully', removed);
  } catch (error) {
    logger.error('Error removing user from workspace:', error);
    return httpError(next, error, req);
  }
};

// Delete Workspace
export const allDeleteWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceIds: number[] = req.body.workspaceIds;
    const userId = req.user?.userId;

    if (!userId) {
      return httpResponse(req, res, 401, 'Unauthorized: Missing user ID.', null);
    }
    if (!Array.isArray(workspaceIds) || workspaceIds.length === 0) {
      return httpResponse(req, res, 400, 'No workspace IDs provided.', null);
    }

    await workspaceService.deleteWorkspaces(workspaceIds, userId);

    return httpResponse(req, res, 200, 'Workspaces deleted successfully');
  } catch (error) {
    logger.error('Error deleting workspaces:', error);
    return httpError(next, error, req);
  }
};

export const deleteWorkspaceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.userId;

    if (!userId) {
      return httpResponse(req, res, 401, 'Unauthorized: Missing user ID.', null);
    }
    if (isNaN(workspaceId)) {
      return httpResponse(req, res, 400, 'Invalid workspace ID.', null);
    }

    await workspaceService.deleteWorkspaceById(workspaceId, userId);

    return httpResponse(req, res, 200, 'Workspace deleted successfully');
  } catch (error) {
    logger.error('Error deleting workspace by ID:', error);
    return httpError(next, error, req);
  }
};

export const getAdminWorkspaces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return httpResponse(req, res, 401, 'Unauthorized: Missing user ID.', null);
    }

    const workspaces = await workspaceService.getAdminWorkspaces(userId);
    httpResponse(req, res, 200, 'Admin workspaces retrieved successfully', workspaces);
  } catch (error) {
    logger.error('Error in getAdminWorkspaces controller:', error);
    return httpError(next, error, req);
  }
};

// Invite User
export const inviteUserToWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const { email, role } = req.body;
    const userId = req.user?.userId;

    if (!userId || !workspaceId || !email || !role) {
      return httpResponse(req, res, 400, 'Missing required fields.', null);
    }

    const normalizedRole = role.toUpperCase() as Role;
    if (!Object.values(Role).includes(normalizedRole)) {
      return httpResponse(req, res, 400, 'Invalid role.', null);
    }

    const invitation = await workspaceService.inviteUserToWorkspace(
      { email, role: normalizedRole, workspaceId },
      userId
    );
    return invitation
      ? httpResponse(req, res, 201, 'Invitation sent', { invitation })
      : httpResponse(req, res, 200, 'User is already part of the workspace');
  } catch (error) {
    return httpError(next, error, req);
  }
};

// Accept Invitation
export const acceptInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { invitetoken: inviteToken } = req.params;

    if (!inviteToken) {
      return httpResponse(req, res, 400, 'Invitation token is required.', null);
    }

    await workspaceService.acceptInvitation(inviteToken);
    return httpResponse(req, res, 200, 'Invitation accepted successfully');
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const setRolePermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { workspaceId, role, permission } = req.body;
    const userId = req.user?.userId;
    const userRoles = req.user?.roles;

    if (!workspaceId || !role || !permission || !userId || !userRoles) {
      return httpResponse(req, res, 400, 'Missing required fields.', null);
    }

    const normalizedRole = role.toUpperCase() as Role;
    if (!Object.values(Role).includes(normalizedRole)) {
      return httpResponse(req, res, 400, 'Invalid role provided.', null);
    }

    // if (!userRoles.includes(Role.ADMIN)) {
    //   return httpResponse(req, res, 403, 'Access denied: Admins only.', null);
    // }

    const result = await workspaceService.setRolesPermissionService(
      Number(workspaceId),
      normalizedRole,
      permission,
      userId
    );

    httpResponse(req, res, 200, 'Permissions assigned successfully', result);
  } catch (error) {
    logger.error('Error assigning permission:', error);
    return httpError(next, error, req);
  }
};

export const assignRolePermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const { role, permissions } = req.body;
    const userId = req.user?.userId;

    if (isNaN(workspaceId) || !userId || !role || !Array.isArray(permissions) || !permissions.length) {
      return httpResponse(req, res, 400, 'Invalid workspace ID, user ID, role, or permissions.', null);
    }

    const upperRole = role.toUpperCase() as Role;
    if (!Object.values(Role).includes(upperRole)) {
      return httpResponse(req, res, 400, 'Invalid role.', null);
    }

    await workspaceService.setRolesPermissionService(workspaceId, upperRole, permissions, userId);
    return httpResponse(req, res, 200, 'Permissions assigned to role successfully');
  } catch (error) {
    return httpError(next, error, req);
  }
};

// Get Workspace Users
export const getWorkspaceUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const userId = req.user?.userId;

    if (!userId || isNaN(workspaceId)) {
      return httpResponse(req, res, 400, 'Invalid request parameters.', null);
    }

    const users = await workspaceService.getWorkspaceUsers(workspaceId, userId);
    httpResponse(req, res, 200, 'Workspace users fetched successfully', users);
  } catch (error) {
    logger.error('Error fetching workspace users:', error);
    return httpError(next, error, req);
  }
};

export const toggleWorkspaceStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);

    if (isNaN(workspaceId)) {
      return httpResponse(req, res, 400, 'Invalid workspaceId.', null);
    }

    const updatedStatus = await workspaceService.toggleWorkspaceStatus(workspaceId);

    httpResponse(req, res, 200, 'Workspace status updated', {
      workspaceId,
      isActive: updatedStatus,
    });
  } catch (error) {
    logger.error('Error toggling workspace status:', error);
    return httpError(next, error, req);
  }
};

export const revokeInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invitationId = parseInt(req.params.invitationId);

    if (isNaN(invitationId)) {
      return httpResponse(req, res, 400, 'Invalid invitationId.', null);
    }

    await workspaceService.revokeInvitation(invitationId);

    httpResponse(req, res, 200, 'Invitation revoked successfully');
  } catch (error) {
    logger.error('Error revoking invitation:', error);
    return httpError(next, error, req);
  }
};

export const getRolePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const role = req.params.role.toUpperCase() as Role;

    if (isNaN(workspaceId) || !role) {
      return httpResponse(req, res, 400, 'Invalid workspaceId or role.', null,);
    }

    const permissions = await workspaceService.getRolePermissions(workspaceId, role);

    httpResponse(req, res, 200, 'Permissions fetched successfully', permissions);
  } catch (error) {
    logger.error('Error fetching role permissions:', error);
    return httpError(next, error, req);
  }
};

export const removeRolePermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const role = req.params.role?.toUpperCase() as Role;
    const { permission } = req.body;
    const userId = req.user?.userId;

    if (isNaN(workspaceId) || !role || !permission || !userId) {
      return httpResponse(req, res, 400, 'Invalid workspace ID, role, permission, or user ID.', null);
    }

    if (!Object.values(Role).includes(role)) {
      return httpResponse(req, res, 400, 'Invalid role.', null);
    }

    await workspaceService.removeRolePermission(workspaceId, role, permission, userId);
    return httpResponse(req, res, 200, 'Permission removed successfully');
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const exportWorkspaceData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);

    if (isNaN(workspaceId)) {
      return httpResponse(req, res, 400, 'Missing or invalid workspaceId.', null);
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

    httpResponse(req, res, 200, 'Workspace data exported successfully', data);
  } catch (error) {
    logger.error('Error exporting workspace data:', error);
    return httpError(next, error, req);
  }
};