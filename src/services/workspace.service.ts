import { InvitationStatus, Prisma, Role } from '@prisma/client';
import { InviteData, WorkspaceInput } from '../types/workspace.types';
import prisma from '../util/prisma';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import bcrypt from 'bcryptjs';
import { SearchParams } from '../types/types';
import sendEmail from '../util/sendEmail';
import redisClient from '../cache/redisClient';

export const workspaceService = {
  createWorkspace: async (userId: string, data: WorkspaceInput) => {
    // Validate input
    if (!userId || !data.name?.trim()) {
      throw new Error('User ID and workspace name are required');
    }

    const baseName = data.name.trim();

    // Check for existing workspace
    await prisma.workspace.findUnique({ where: { name: baseName } }).then(existing => {
      if (existing) throw new Error(`Workspace "${baseName}" already exists`);
    });

    // Generate unique slug
    const slug = `${slugify(baseName, { lower: true })}-${uuidv4().slice(0, 6)}`;
    console.log(Array.isArray(data.images) ? data.images : [], 'data.images');

    // Create workspace
    return prisma.workspace.create({
      data: {
        name: baseName,
        slug,
        description: data.description?.trim() ?? null,
        images: data.images ?? [],
        openingTime: data.openingTime ?? null,
        closingTime: data.closingTime ?? null,
        isActive: data.isActive ?? true,
        owner: { connect: { id: userId } },
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    }).catch(err => {
      throw new Error(err.message || 'Failed to create workspace');
    });
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
      console.error('Error fetching admin workspaces from DB:', error);
      throw new Error('Failed to fetch admin workspaces');
    }
  },

  getWorkspace: async ({ search, page, limit }: SearchParams) => {
    const cacheKey = `workspaces:search=${search || 'all'}:page=${page}:limit=${limit}`;

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Define search filter
    const where: Prisma.WorkspaceWhereInput = search
      ? { slug: { contains: search, mode: 'insensitive' } }
      : {};

    // Fetch data with pagination
    const results = await prisma.workspace.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit + 1,
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
        openingTime: true,
        closingTime: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Prepare response
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;
    const response = { data, meta: { page, limit, hasNextPage } };

    // Cache result
    await redisClient.setEx(cacheKey, 60, JSON.stringify(response));

    return response;
  },

  updateWorkspace: async (
    workspaceId: number,
    userId: string,
    data: Partial<WorkspaceInput>
  ) => {
    try {
      return await prisma.workspace.update({
        where: {
          id: workspaceId,
          ownerId: userId
        },
        data,
        include: {
          owner: true
        }
      });
    } catch (error) {
      throw new Error('Unauthorized or workspace not found');
    }
  },

  deleteWorkspaces: async (workspaceIds: number[], userId: string) => {
    const workspaces = await prisma.workspace.findMany({
      where: {
        id: { in: workspaceIds },
        ownerId: userId,
      },
      select: { id: true },
    });

    const foundIds = workspaces.map(ws => ws.id);
    const notFoundIds = workspaceIds.filter(id => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new Error(`Some workspaces not found or not owned by user: ${notFoundIds.join(', ')}`);
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: { workspaceId: { in: workspaceIds } },
      }),
      prisma.category.deleteMany({
        where: { workspaceId: { in: workspaceIds } },
      }),
      prisma.invitation.deleteMany({
        where: { workspaceId: { in: workspaceIds } },
      }),
      prisma.workspace.deleteMany({
        where: { id: { in: workspaceIds } },
      }),
    ]);
  },
  deleteWorkspaceById: async (workspaceId: number, userId: string): Promise<void> => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found.');
    }

    if (workspace.ownerId !== userId) {
      throw new Error('You are not authorized to delete this workspace.');
    }

    await prisma.workspace.delete({
      where: { id: workspaceId },
    });
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
  inviteUserToWorkspace: async (
    { email, role, workspaceId }: InviteData,
    invitedById: string
  ) => {
    // Validate workspace and user status in parallel
    const [workspace, existingInvite, existingUser] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, users: { where: { email }, select: { id: true } } },
      }).then(ws => {
        if (!ws) throw new Error('Workspace not found');
        if (ws.users.length > 0) return null; // User already in workspace
        return ws;
      }),
      prisma.invitation.findFirst({
        where: { email, workspaceId, status: InvitationStatus.ACCEPTED },
      }).then(invite => {
        if (invite) throw new Error('Invitation already accepted for this workspace');
        return invite;
      }),
      prisma.user.findUnique({ where: { email }, select: { id: true, firstName: true } }),
    ]);

    if (!workspace) return null; // User already in workspace

    // Create or retrieve user
    let invitedUserId = existingUser?.id;
    let firstName = existingUser?.firstName ?? 'User';

    if (!existingUser) {
      const tempPassword = uuidv4().slice(0, 8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          isActive: true,
          firstName: 'Invited',
          lastName: 'User',
        },
        select: { id: true, firstName: true },
      });
      invitedUserId = newUser.id;
      firstName = newUser.firstName;
    }

    // Create invitation
    const inviteToken = uuidv4();
    const invitation = await prisma.invitation.create({
      data: {
        email,
        tempPassword: uuidv4().slice(0, 8),
        inviteToken,
        status: InvitationStatus.PENDING,
        role,
        workspaceId,
        invitedById,
        invitedUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8" /></head>
        <body style="font-family: Arial, sans-serif; background: #f6f6f6; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333;">👋 You're Invited!</h2>
            <p>Hi <strong>${firstName}</strong>,</p>
            <p>You’ve been invited to join <strong>${workspace.name}</strong> as a <strong>${role}</strong>.</p>
            <p>Your temporary password is: <strong style="background: #f0f0f0; padding: 5px; border-radius: 3px;">${invitation.tempPassword}</strong></p>
            <p>Please log in and update your password.</p>
            <a href="${process.env.SERVER_URL}/api/v1/workspaces/invitation/accept/${inviteToken}" 
               style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
              Accept Invitation
            </a>
            <p style="font-size: 12px; color: #999;">Backey Management © ${new Date().getFullYear()}</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail(email, `Invitation to join ${workspace.name}`, emailHtml);
    return invitation;
  },

  acceptInvitation: async (inviteToken: string) => {
    const invitation = await prisma.invitation.findUnique({
      where: { inviteToken },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        invitedUserId: true,
        workspaceId: true,
      },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invitation already accepted or expired');
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    if (!invitation.invitedUserId) {
      throw new Error('Invited user ID is missing');
    }

    // Accept the invitation and add the user to workspace
    const [_, workspace] = await Promise.all([
      prisma.invitation.update({
        where: { inviteToken },
        data: { status: InvitationStatus.ACCEPTED },
      }),
      prisma.workspace.update({
        where: { id: invitation.workspaceId },
        data: {
          users: {
            connect: { id: invitation.invitedUserId },
          },
        },
      }),
    ]);

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
    role: Role,
    permissions: string[],
    userId: string
  ) => {
    // Validate workspace and ownership
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, ownerId: true },
    });

    if (!workspace) throw new Error('Workspace not found');
    if (workspace.ownerId !== userId) throw new Error('Only the workspace owner can assign permissions');

    // Upsert role permission
    return prisma.rolePermission.upsert({
      where: { workspaceId_role: { workspaceId, role } },
      update: {
        permission: { push: permissions }, // Add new permissions, automatically handles duplicates
      },
      create: {
        workspaceId,
        role,
        permission: permissions,
      },
    });
  },

  getWorkspaceUsers: async (workspaceId: number, userId: string) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            status: true,
            isActive: true,
            profileImageUrl: true,
          },
        },
      },
    });

    if (!workspace || workspace.ownerId !== userId) {
      throw new Error('Unauthorized');
    }

    return workspace.users;
  },

  getWorkspacesByUserId: async (userId: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const workspaces = await prisma.workspace.findMany({
        where: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!workspaces || workspaces.length === 0) {
        throw new Error('No workspaces found for this user');
      }

      return workspaces;
    } catch (error) {
      // Log the actual error for debugging purposes
      console.error(error);

      // Check if it's a Prisma error or generic
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors if necessary
        throw new Error('Database query failed: ' + error.message);
      }

      throw new Error('Failed to fetch user workspaces: ' + error);
    }
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
      const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.REVOKED },
      });
    } catch (error) {
      console.error('Service error revoking invitation:', error);
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

  removeRolePermission: async (workspaceId: number, role: Role, permissionToRemove: string, userId: string) => {
    // Validate workspace and ownership
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, ownerId: true },
    });

    if (!workspace) throw new Error('Workspace not found');
    if (workspace.ownerId !== userId) throw new Error('Only the workspace owner can remove permissions');

    // Use transaction for atomic operation
    return prisma.$transaction(async (tx) => {
      // Find role permission
      const rolePermission = await tx.rolePermission.findUnique({
        where: { workspaceId_role: { workspaceId, role } },
      });

      if (!rolePermission) throw new Error('Role permission not found');

      // Check if permission exists
      if (!rolePermission.permission.includes(permissionToRemove)) return null;

      // Filter out the permission
      const updatedPermissions = rolePermission.permission.filter(p => p !== permissionToRemove);

      // Delete if no permissions remain, otherwise update
      if (updatedPermissions.length === 0) {
        await tx.rolePermission.delete({
          where: { workspaceId_role: { workspaceId, role } },
        });
      } else {
        await tx.rolePermission.update({
          where: { workspaceId_role: { workspaceId, role } },
          data: { permission: updatedPermissions },
        });
      }

      return true;
    });
  },
  exportWorkspaceData: async (
    workspaceId: number,
    userPage: number = 1,
    userPageSize: number = 10,
    invitationPage: number = 1,
    invitationPageSize: number = 10
  ) => {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          openingTime: true,
          closingTime: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Fetch paginated users
          users: {
            skip: (userPage - 1) * userPageSize,
            take: userPageSize,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              status: true,
              phone: true,
            },
          },
          // Fetch paginated invitations
          invitations: {
            skip: (invitationPage - 1) * invitationPageSize,
            take: invitationPageSize,
            select: {
              id: true,
              email: true,
              status: true,
              role: true,
              createdAt: true,
              acceptedAt: true,
            },
          },
        },
      });

      if (!workspace) throw new Error('Workspace not found');

      // Count total for pagination
      const [userCount, invitationCount] = await Promise.all([
        prisma.user.count({
          where: {
            workspaces: {
              some: {
                id: workspaceId,
              },
            },
          },
        }),
        prisma.invitation.count({
          where: {
            workspaceId,
          },
        }),
      ]);

      return {
        workspace,
        pagination: {
          users: {
            page: userPage,
            pageSize: userPageSize,
            total: userCount,
          },
          invitations: {
            page: invitationPage,
            pageSize: invitationPageSize,
            total: invitationCount,
          },
        },
      };
    } catch (error) {
      console.error('❌ Service error exporting workspace data:', error);
      throw new Error('Failed to export workspace data');
    }
  }

};
