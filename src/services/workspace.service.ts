import { InvitationStatus, Prisma, Role } from "@prisma/client";
import { WorkspaceInput } from "../types/workspace.types";
import prisma from "../util/prisma";
import { v4 as uuidv4 } from 'uuid';
import slugify from "slugify";
import bcrypt from 'bcryptjs';
import { SearchParams } from "../types/types";
import sendEmail from "../util/sendEmail";

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
      const filters: Prisma.WorkspaceWhereInput[] = [];

      if (search) {
        if (!isNaN(Number(search))) {
          filters.push({ id: Number(search) });
        }

        filters.push(
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } }
        );
      }

      const whereClause: Prisma.WorkspaceWhereInput = filters.length > 0 ? { OR: filters } : {};

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
  // const { email, role, workspaceId } = data;
  // const inviteToken = uuidv4();
  // const tempPassword = uuidv4().slice(0, 8);
  // const hashedPassword = await bcrypt.hash(tempPassword, 10);
  inviteUserToWorkspace: async (
    data: { email: string; role: Role; workspaceId: number },
    invitedById: string
  ) => {
    const inviteToken = uuidv4();
    const tempPassword = uuidv4().slice(0, 8);

    // Fetch data in parallel
    const [existingInvite, existingUser, workspaceWithUser] = await Promise.all([
      prisma.invitation.findFirst({
        where: {
          email: data.email,
          workspaceId: data.workspaceId,
          status: InvitationStatus.ACCEPTED,
        },
        select: {
          id: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          email: data.email,
        },
        select: {
          id: true,
          firstName: true,
        },
      }),
      prisma.workspace.findUnique({
        where: {
          id: data.workspaceId,
        },
        select: {
          name: true,
          users: {
            where: {
              email: data.email,
            },
            select: {
              id: true,
            },
          },
        },
      }),
    ]);


    if (!workspaceWithUser) throw new Error('Workspace not found');

    if (existingInvite) {
      throw new Error('Invitation already sent to this email for this workspace');
    }

    if (workspaceWithUser.users?.length > 0) {
      throw new Error('User has already accepted invitation and is in the workspace');
    }

    let invitedUserId = existingUser?.id;
    let firstName = existingUser?.firstName ?? 'User';

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const newUser = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: data.role,
          isActive: true,
          firstName: 'Invited',
          lastName: 'User',
        },
        select: { id: true, firstName: true },
      });

      invitedUserId = newUser.id;
      firstName = newUser.firstName;
    }

    const invitation = await prisma.invitation.create({
      data: {
        email: data.email,
        tempPassword,
        inviteToken,
        status: InvitationStatus.PENDING,
        role: data.role,
        workspaceId: data.workspaceId,
        invitedById,
        invitedUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8" /></head>
        <body style="font-family: Arial, sans-serif; background: #f6f6f6; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333;">👋 You're Invited!</h2>
            <p>Hi <strong>${firstName}</strong>,</p>
            <p>You’ve been invited to join the workspace <strong>${workspaceWithUser.name}</strong> as a <strong>${data.role}</strong>.</p>
            <p>Your temporary password is:</p>
            <p style="font-size: 18px; background: #f0f0f0; padding: 10px; display: inline-block; border-radius: 5px;">
              ${tempPassword}
            </p>
            <p>Please login and update your password.</p>
            <a href="${process.env.SERVER_URL}/api/v1/workspaces/invitation/accept/${inviteToken}" 
              style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
              Accept Invitation
            </a>
            <p style="margin-top: 40px; font-size: 12px; color: #999;">Backey Management &copy; ${new Date().getFullYear()}</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail(
      data.email,
      `You're invited to join ${workspaceWithUser.name}`,
      emailHtml
    );

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
    try {
      return await prisma.workspace.findMany({
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
          updatedAt: true,
        },
      });
    } catch (error) {
      throw new Error('Failed to fetch user workspaces');
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

    const updatedPermissions = existing.permission.filter((p) => p !== permissionToRemove);

    return prisma.rolePermission.update({
      where: { id: existing.id },
      data: { permission: updatedPermissions },
    });
  },

};
