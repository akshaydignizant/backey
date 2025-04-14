import { InvitationStatus, Role } from "@prisma/client";
import { WorkspaceInput } from "../types/workspace.types";
import prisma from "../util/prisma";
import { v4 as uuidv4 } from 'uuid';
import slugify from "slugify";
import bcrypt from 'bcryptjs';
import { SearchParams } from "../types/types";

export const workspaceService = {
  createWorkspace: async (userId: string, data: WorkspaceInput) => {
    try {
      // Step 1: Validate input
      if (!userId || !data.name || typeof data.name !== 'string') {
        throw new Error('User ID and workspace name are required');
      }

      const baseName = data.name.trim();

      // Step 2: Check if workspace with the same name exists
      const existing = await prisma.workspace.findUnique({
        where: { name: baseName },
      });

      if (existing) {
        throw new Error(`A workspace with the name "${baseName}" already exists.`);
      }

      // Step 3: Generate a unique slug
      const slug = `${slugify(baseName, { lower: true })}-${uuidv4().slice(0, 6)}`;

      // Step 4: Create the workspace
      const createdWorkspace = await prisma.workspace.create({
        data: {
          name: baseName,
          slug,
          description: data.description?.trim() || null,
          images: Array.isArray(data.images) ? data.images : [],
          openingTime: data.openingTime || null,
          closingTime: data.closingTime || null,
          isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
          owner: {
            connect: { id: userId },
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return createdWorkspace;
    } catch (error: any) {
      console.error('❌ Error creating workspace:', error);
      throw new Error(error.message || 'Failed to create workspace');
    }
  },

  getAdminWorkspaces: async (userId: string) => {
    try {
      return await prisma.workspace.findMany({
        where: {
          ownerId: userId,
          owner: {
            role: Role.ADMIN,
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          images: true,
          openingTime: true,
          closingTime: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error: any) {
      console.error('❌ Error fetching admin workspaces from DB:', error);
      throw new Error('Failed to fetch admin workspaces');
    }
  },

  getWorkspace: async ({ search, page, limit }: SearchParams) => {
    try {
      const whereClause = search
        ? {
          OR: [
            { id: !isNaN(Number(search)) ? Number(search) : undefined },
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ].filter(Boolean) as any[],
        }
        : {};

      const [data, total] = await Promise.all([
        prisma.workspace.findMany({
          where: whereClause,
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            images: true,
            openingTime: true,
            closingTime: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            products: {
              select: { id: true, name: true },
            },
            categories: {
              select: { id: true, name: true },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.workspace.count({ where: whereClause }),
      ]);

      return { data, total };
    } catch (error: any) {
      console.error('❌ Error fetching workspace from DB:', error);
      throw new Error('Failed to fetch workspace');
    }
  },

  updateWorkspace: async (workspaceId: number, userId: string, data: Partial<WorkspaceInput>) => {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
    });

    if (!workspace) throw new Error('Unauthorized or workspace not found');

    return prisma.workspace.update({
      where: { id: workspaceId },
      data,
      include: { owner: true },
    });
  },

  deleteWorkspace: async (workspaceId: number, userId: string) => {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
    });

    if (!workspace) throw new Error('Unauthorized or workspace not found');

    await prisma.workspace.delete({ where: { id: workspaceId } });
  },

  removeUserFromWorkspace: async (
    workspaceId: number,
    email: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<string> => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const isOwner = workspace.ownerId === currentUserId;
    const isAdmin = currentUserRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new Error('Only the workspace owner or admin can remove users');
    }

    const userToRemove = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToRemove) {
      throw new Error('User not found');
    }

    // Check if user is associated with the workspace
    const isInWorkspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        users: {
          some: {
            id: userToRemove.id,
          },
        },
      },
    });

    if (!isInWorkspace) {
      throw new Error('User is not a member of this workspace');
    }

    // Remove the user from the workspace
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        users: {
          disconnect: {
            id: userToRemove.id,
          },
        },
      },
    });

    return `User ${email} has been removed from the workspace`;
  }
  ,
  inviteUserToWorkspace: async (data: { email: string, role: Role, workspaceId: number }, invitedById: string) => {
    const tempPassword = uuidv4().slice(0, 8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const inviteToken = uuidv4();

    const existingInvite = await prisma.invitation.findFirst({
      where: { email: data.email }
    });

    if (existingInvite) {
      throw new Error('Invitation already sent to this email');
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

    let invitedUserId: string | null = null;

    if (existingUser) {
      invitedUserId = existingUser.id;
    } else {
      const newUser = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: data.role,
          isActive: true,
          firstName: 'Invited',
          lastName: 'User',
        },
      });
      invitedUserId = newUser.id;
    }

    if (invitedUserId) {
      return prisma.invitation.create({
        data: {
          email: data.email,
          tempPassword,
          inviteToken,
          status: InvitationStatus.PENDING,
          role: data.role,
          workspaceId: data.workspaceId,
          invitedById,
          invitedUserId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      throw new Error("Failed to find invited user or userId is null");
    }
  },

  acceptInvitation: async (token: string) => {
    const invitation = await prisma.invitation.findUnique({ where: { inviteToken: token } });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invalid or expired invitation');
    }

    await prisma.invitation.update({
      where: { inviteToken: token },
      data: { status: InvitationStatus.ACCEPTED },
    });

    const workspace = await prisma.workspace.update({
      where: { id: invitation.workspaceId },
      data: {
        users: {
          connect: { id: invitation.invitedUserId ?? undefined },
        },
      },
    });

    return workspace;
  },

  getInvitations: async (userId: string) => {
    return prisma.invitation.findMany({
      where: { invitedUserId: userId, status: InvitationStatus.PENDING },
      include: { workspace: true },
    });
  },

  setRolesPermissionService: async (
    workspaceId: number,
    role: string,
    permission: string,
    userId: string
  ) => {
    try {
      // Step 1: Validate workspace and check if the user is the admin owner
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { owner: true },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      if (workspace.ownerId !== userId) {
        throw new Error('Only the admin who owns the workspace can assign permissions');
      }

      // Step 2: Check if the role permission already exists
      const existingRolePermission = await prisma.rolePermission.findUnique({
        where: {
          workspaceId_role: {
            workspaceId,
            role: role.toUpperCase() as Role,
          },
        },
      });

      if (existingRolePermission) {
        // The role permission exists, so we'll update it instead of creating a new one
        const updatedPermission = await prisma.rolePermission.update({
          where: {
            workspaceId_role: {
              workspaceId,
              role: role.toUpperCase() as Role,
            },
          },
          data: {
            permission: Array.from(new Set([...existingRolePermission.permission, permission])),
          },
        });

        return updatedPermission; // Return the updated role permission
      }

      // Step 3: Create a new role permission if it doesn't exist
      const newPermission = await prisma.rolePermission.create({
        data: {
          workspaceId,
          role: role.toUpperCase() as Role,
          permission: [permission],
        },
      });

      return newPermission; // Return the newly created permission
    } catch (error) {
      console.error('Error assigning role permission:', error);
      throw new Error('Failed to assign role permission');
    }
  },

  getWorkspaceUsers: async (workspaceId: number, userId: string) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { users: true },
    });

    if (!workspace || workspace.ownerId !== userId) {
      throw new Error('Unauthorized');
    }

    return workspace.users;
  },
  toggleWorkspaceStatus: async (workspaceId: number): Promise<boolean> => {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { isActive: true },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const updated = await prisma.workspace.update({
        where: { id: workspaceId },
        data: { isActive: !workspace.isActive },
        select: { isActive: true },
      });

      return updated.isActive;
    } catch (error) {
      console.error('❌ Service error toggling workspace status:', error);
      throw new Error('Failed to toggle workspace status');
    }
  },
  revokeInvitation: async (invitationId: number) => {
    try {
      const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
      if (!invitation) throw new Error('Invitation not found');

      await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: 'REVOKED' },
      });
    } catch (error) {
      console.error('❌ Service error revoking invitation:', error);
      throw new Error('Failed to revoke invitation');
    }
  },
  getRolePermissions: async (workspaceId: number, role: Role) => {
    try {
      return await prisma.rolePermission.findMany({
        where: { workspaceId, role },
      });
    } catch (error) {
      console.error('❌ Service error fetching role permissions:', error);
      throw new Error('Failed to fetch role permissions');
    }
  },

  removeRolePermission: async (workspaceId: number, role: Role, permissionToRemove: string) => {
    const existing = await prisma.rolePermission.findFirst({
      where: { workspaceId, role },
    });

    if (!existing) throw new Error('Role permission not found');

    const updatedPermissions = existing.permission.filter(p => p !== permissionToRemove);

    return prisma.rolePermission.update({
      where: { id: existing.id },
      data: { permission: updatedPermissions },
    });
  },

};
