// import { InvitationStatus, Prisma, Role } from '@prisma/client';
// import { InviteData, WorkspaceInput } from '../types/workspace.types';
// import prisma from '../util/prisma';
// import { v4 as uuidv4 } from 'uuid';
// import slugify from 'slugify';
// import bcrypt from 'bcryptjs';
// import { SearchParams } from '../types/types';
// import sendEmail from '../util/sendEmail';
// import redisClient from '../cache/redisClient';

// export const workspaceService = {
//   createWorkspace: async (userId: string, data: WorkspaceInput) => {
//     // Validate input
//     if (!userId || !data.name?.trim()) {
//       throw new Error('User ID and workspace name are required');
//     }

//     const baseName = data.name.trim();

//     // Check for existing workspace
//     await prisma.workspace.findUnique({ where: { name: baseName } }).then(existing => {
//       if (existing) throw new Error(`Workspace "${baseName}" already exists`);
//     });

//     // Generate unique slug
//     const slug = `${slugify(baseName, { lower: true })}-${uuidv4().slice(0, 6)}`;
//     console.log(Array.isArray(data.images) ? data.images : [], 'data.images');

//     // Create workspace
//     return prisma.workspace.create({
//       data: {
//         name: baseName,
//         slug,
//         description: data.description?.trim() ?? null,
//         images: data.images ?? [],
//         openingTime: data.openingTime ?? null,
//         closingTime: data.closingTime ?? null,
//         isActive: data.isActive ?? true,
//         owner: { connect: { id: userId } },
//       },
//       include: {
//         owner: {
//           select: { id: true, firstName: true, lastName: true, email: true, role: true },
//         },
//       },
//     }).catch(err => {
//       throw new Error(err.message || 'Failed to create workspace');
//     });
//   },

//   getAdminWorkspaces: async (userId: string) => {
//     try {
//       return await prisma.workspace.findMany({
//         where: {
//           ownerId: userId,
//           owner: {
//             role: Role.ADMIN,
//           },
//         },
//         select: {
//           id: true,
//           name: true,
//           slug: true,
//           description: true,
//           images: true,
//           openingTime: true,
//           closingTime: true,
//           isActive: true,
//           createdAt: true,
//           updatedAt: true,
//         },
//         orderBy: {
//           createdAt: 'desc',
//         },
//       });
//     } catch (error: any) {
//       console.error('Error fetching admin workspaces from DB:', error);
//       throw new Error('Failed to fetch admin workspaces');
//     }
//   },

//   getWorkspace: async ({ search, page, limit }: SearchParams) => {
//     const cacheKey = `workspaces:search=${search || 'all'}:page=${page}:limit=${limit}`;

//     // Check cache
//     const cached = await redisClient.get(cacheKey);
//     if (cached) return JSON.parse(cached);

//     // Define search filter
//     const where: Prisma.WorkspaceWhereInput = search
//       ? { slug: { contains: search, mode: 'insensitive' } }
//       : {};

//     // Fetch data with pagination
//     const results = await prisma.workspace.findMany({
//       where,
//       skip: (page - 1) * limit,
//       take: limit + 1,
//       select: {
//         id: true,
//         name: true,
//         slug: true,
//         images: true,
//         openingTime: true,
//         closingTime: true,
//         isActive: true,
//         createdAt: true,
//       },
//       orderBy: { createdAt: 'desc' },
//     });

//     // Prepare response
//     const hasNextPage = results.length > limit;
//     const data = hasNextPage ? results.slice(0, limit) : results;
//     const response = { data, meta: { page, limit, hasNextPage } };

//     // Cache result
//     await redisClient.setEx(cacheKey, 60, JSON.stringify(response));

//     return response;
//   },

//   updateWorkspace: async (
//     workspaceId: number,
//     userId: string,
//     data: Partial<WorkspaceInput>
//   ) => {
//     try {
//       return await prisma.workspace.update({
//         where: {
//           id: workspaceId,
//           ownerId: userId
//         },
//         data,
//         include: {
//           owner: true
//         }
//       });
//     } catch (error) {
//       throw new Error('Unauthorized or workspace not found');
//     }
//   },

//   deleteWorkspaces: async (workspaceIds: number[], userId: string) => {
//     const workspaces = await prisma.workspace.findMany({
//       where: {
//         id: { in: workspaceIds },
//         ownerId: userId,
//       },
//       select: { id: true },
//     });

//     const foundIds = workspaces.map(ws => ws.id);
//     const notFoundIds = workspaceIds.filter(id => !foundIds.includes(id));

//     if (notFoundIds.length > 0) {
//       throw new Error(`Some workspaces not found or not owned by user: ${notFoundIds.join(', ')}`);
//     }

//     await prisma.$transaction([
//       prisma.rolePermission.deleteMany({
//         where: { workspaceId: { in: workspaceIds } },
//       }),
//       prisma.category.deleteMany({
//         where: { workspaceId: { in: workspaceIds } },
//       }),
//       prisma.invitation.deleteMany({
//         where: { workspaceId: { in: workspaceIds } },
//       }),
//       prisma.workspace.deleteMany({
//         where: { id: { in: workspaceIds } },
//       }),
//     ]);
//   },
//   deleteWorkspaceById: async (workspaceId: number, userId: string): Promise<void> => {
//     const workspace = await prisma.workspace.findUnique({
//       where: { id: workspaceId },
//     });

//     if (!workspace) {
//       throw new Error('Workspace not found.');
//     }

//     if (workspace.ownerId !== userId) {
//       throw new Error('You are not authorized to delete this workspace.');
//     }

//     await prisma.workspace.delete({
//       where: { id: workspaceId },
//     });
//   },

//   removeUserFromWorkspace: async (
//     workspaceId: number,
//     email: string,
//     currentUserId: string,
//     currentUserRole: string
//   ): Promise<string> => {
//     const workspace = await prisma.workspace.findUnique({
//       where: { id: workspaceId },
//     });

//     if (!workspace) {
//       throw new Error('Workspace not found');
//     }

//     const isOwner = workspace.ownerId === currentUserId;
//     const isAdmin = currentUserRole === 'ADMIN';

//     if (!isOwner && !isAdmin) {
//       throw new Error('Only the workspace owner or admin can remove users');
//     }

//     const userToRemove = await prisma.user.findUnique({
//       where: { email },
//     });

//     if (!userToRemove) {
//       throw new Error('User not found');
//     }

//     // Check if user is associated with the workspace
//     const isInWorkspace = await prisma.workspace.findFirst({
//       where: {
//         id: workspaceId,
//         users: {
//           some: {
//             id: userToRemove.id,
//           },
//         },
//       },
//     });

//     if (!isInWorkspace) {
//       throw new Error('User is not a member of this workspace');
//     }

//     // Remove the user from the workspace
//     await prisma.workspace.update({
//       where: { id: workspaceId },
//       data: {
//         users: {
//           disconnect: {
//             id: userToRemove.id,
//           },
//         },
//       },
//     });

//     return `User ${email} has been removed from the workspace`;
//   }
//   ,
//   inviteUserToWorkspace: async (
//     { email, role, workspaceId }: InviteData,
//     invitedById: string
//   ) => {
//     // Validate workspace and user status in parallel
//     const [workspace, existingInvite, existingUser] = await Promise.all([
//       prisma.workspace.findUnique({
//         where: { id: workspaceId },
//         select: { id: true, name: true, users: { where: { email }, select: { id: true } } },
//       }).then(ws => {
//         if (!ws) throw new Error('Workspace not found');
//         if (ws.users.length > 0) return null; // User already in workspace
//         return ws;
//       }),
//       prisma.invitation.findFirst({
//         where: { email, workspaceId, status: InvitationStatus.ACCEPTED },
//       }).then(invite => {
//         if (invite) throw new Error('Invitation already accepted for this workspace');
//         return invite;
//       }),
//       prisma.user.findUnique({ where: { email }, select: { id: true, firstName: true } }),
//     ]);

//     if (!workspace) return null; // User already in workspace

//     // Create or retrieve user
//     let invitedUserId = existingUser?.id;
//     let firstName = existingUser?.firstName ?? 'User';

//     if (!existingUser) {
//       const tempPassword = uuidv4().slice(0, 8);
//       const hashedPassword = await bcrypt.hash(tempPassword, 10);
//       const newUser = await prisma.user.create({
//         data: {
//           email,
//           password: hashedPassword,
//           role,
//           isActive: true,
//           firstName: 'Invited',
//           lastName: 'User',
//         },
//         select: { id: true, firstName: true },
//       });
//       invitedUserId = newUser.id;
//       firstName = newUser.firstName;
//     }

//     // Create invitation
//     const inviteToken = uuidv4();
//     const invitation = await prisma.invitation.create({
//       data: {
//         email,
//         tempPassword: uuidv4().slice(0, 8),
//         inviteToken,
//         status: InvitationStatus.PENDING,
//         role,
//         workspaceId,
//         invitedById,
//         invitedUserId,
//         expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
//       },
//     });

//     // Send email
//     const emailHtml = `
//       <!DOCTYPE html>
//       <html>
//         <head><meta charset="UTF-8" /></head>
//         <body style="font-family: Arial, sans-serif; background: #f6f6f6; padding: 20px;">
//           <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px;">
//             <h2 style="color: #333;">👋 You're Invited!</h2>
//             <p>Hi <strong>${firstName}</strong>,</p>
//             <p>You’ve been invited to join <strong>${workspace.name}</strong> as a <strong>${role}</strong>.</p>
//             <p>Your temporary password is: <strong style="background: #f0f0f0; padding: 5px; border-radius: 3px;">${invitation.tempPassword}</strong></p>
//             <p>Please log in and update your password.</p>
//             <a href="${process.env.SERVER_URL}/api/v1/workspaces/invitation/accept/${inviteToken}" 
//                style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
//               Accept Invitation
//             </a>
//             <p style="font-size: 12px; color: #999;">Backey Management © ${new Date().getFullYear()}</p>
//           </div>
//         </body>
//       </html>
//     `;

//     await sendEmail(email, `Invitation to join ${workspace.name}`, emailHtml);
//     return invitation;
//   },

//   acceptInvitation: async (inviteToken: string) => {
//     const invitation = await prisma.invitation.findUnique({
//       where: { inviteToken },
//       select: {
//         id: true,
//         status: true,
//         expiresAt: true,
//         invitedUserId: true,
//         workspaceId: true,
//       },
//     });

//     if (!invitation) {
//       throw new Error('Invitation not found');
//     }

//     if (invitation.status !== InvitationStatus.PENDING) {
//       throw new Error('Invitation already accepted or expired');
//     }

//     if (invitation.expiresAt < new Date()) {
//       throw new Error('Invitation has expired');
//     }

//     if (!invitation.invitedUserId) {
//       throw new Error('Invited user ID is missing');
//     }

//     // Accept the invitation and add the user to workspace
//     const [_, workspace] = await Promise.all([
//       prisma.invitation.update({
//         where: { inviteToken },
//         data: { status: InvitationStatus.ACCEPTED },
//       }),
//       prisma.workspace.update({
//         where: { id: invitation.workspaceId },
//         data: {
//           users: {
//             connect: { id: invitation.invitedUserId },
//           },
//         },
//       }),
//     ]);

//     return workspace;
//   },

//   getInvitations: async (userId: string) => {
//     return prisma.invitation.findMany({
//       where: { invitedUserId: userId, status: InvitationStatus.PENDING },
//       include: { workspace: true },
//     });
//   },

//   setRolesPermissionService: async (
//     workspaceId: number,
//     role: Role,
//     permissions: string[],
//     userId: string
//   ) => {
//     // Validate workspace and ownership
//     const workspace = await prisma.workspace.findUnique({
//       where: { id: workspaceId },
//       select: { id: true, ownerId: true },
//     });

//     if (!workspace) throw new Error('Workspace not found');
//     if (workspace.ownerId !== userId) throw new Error('Only the workspace owner can assign permissions');

//     // Upsert role permission
//     return prisma.rolePermission.upsert({
//       where: { workspaceId_role: { workspaceId, role } },
//       update: {
//         permission: { push: permissions }, // Add new permissions, automatically handles duplicates
//       },
//       create: {
//         workspaceId,
//         role,
//         permission: permissions,
//       },
//     });
//   },

//   getWorkspaceUsers: async (workspaceId: number, userId: string) => {
//     const workspace = await prisma.workspace.findUnique({
//       where: { id: workspaceId },
//       include: {
//         users: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//             role: true,
//             status: true,
//             isActive: true,
//             profileImageUrl: true,
//           },
//         },
//       },
//     });

//     if (!workspace || workspace.ownerId !== userId) {
//       throw new Error('Unauthorized');
//     }

//     return workspace.users;
//   },

//   getWorkspacesByUserId: async (userId: string) => {
//     if (!userId) {
//       throw new Error('User ID is required');
//     }

//     try {
//       const workspaces = await prisma.workspace.findMany({
//         where: {
//           users: {
//             some: {
//               id: userId,
//             },
//           },
//         },
//         select: {
//           id: true,
//           name: true,
//           slug: true,
//           description: true,
//           isActive: true,
//           createdAt: true,
//         },
//       });

//       if (!workspaces || workspaces.length === 0) {
//         throw new Error('No workspaces found for this user');
//       }

//       return workspaces;
//     } catch (error) {
//       // Log the actual error for debugging purposes
//       console.error(error);

//       // Check if it's a Prisma error or generic
//       if (error instanceof Prisma.PrismaClientKnownRequestError) {
//         // Handle specific Prisma errors if necessary
//         throw new Error('Database query failed: ' + error.message);
//       }

//       throw new Error('Failed to fetch user workspaces: ' + error);
//     }
//   },

//   toggleWorkspaceStatus: async (workspaceId: number): Promise<boolean> => {
//     try {
//       const workspace = await prisma.workspace.findUnique({
//         where: { id: workspaceId },
//         select: { isActive: true },
//       });

//       if (!workspace) {
//         throw new Error('Workspace not found');
//       }

//       const updated = await prisma.workspace.update({
//         where: { id: workspaceId },
//         data: { isActive: !workspace.isActive },
//         select: { isActive: true },
//       });

//       return updated.isActive;
//     } catch (error) {
//       console.error('❌ Service error toggling workspace status:', error);
//       throw new Error('Failed to toggle workspace status');
//     }
//   },
//   revokeInvitation: async (invitationId: number) => {
//     try {
//       const invitation = await prisma.invitation.findUnique({
//         where: { id: invitationId },
//       });

//       if (!invitation) {
//         throw new Error('Invitation not found');
//       }

//       await prisma.invitation.update({
//         where: { id: invitationId },
//         data: { status: InvitationStatus.REVOKED },
//       });
//     } catch (error) {
//       console.error('Service error revoking invitation:', error);
//       throw new Error('Failed to revoke invitation');
//     }
//   },
//   getRolePermissions: async (workspaceId: number, role: Role) => {
//     try {
//       return await prisma.rolePermission.findMany({
//         where: { workspaceId, role },
//       });
//     } catch (error) {
//       console.error('❌ Service error fetching role permissions:', error);
//       throw new Error('Failed to fetch role permissions');
//     }
//   },

//   removeRolePermission: async (workspaceId: number, role: Role, permissionToRemove: string, userId: string) => {
//     // Validate workspace and ownership
//     const workspace = await prisma.workspace.findUnique({
//       where: { id: workspaceId },
//       select: { id: true, ownerId: true },
//     });

//     if (!workspace) throw new Error('Workspace not found');
//     if (workspace.ownerId !== userId) throw new Error('Only the workspace owner can remove permissions');

//     // Use transaction for atomic operation
//     return prisma.$transaction(async (tx) => {
//       // Find role permission
//       const rolePermission = await tx.rolePermission.findUnique({
//         where: { workspaceId_role: { workspaceId, role } },
//       });

//       if (!rolePermission) throw new Error('Role permission not found');

//       // Check if permission exists
//       if (!rolePermission.permission.includes(permissionToRemove)) return null;

//       // Filter out the permission
//       const updatedPermissions = rolePermission.permission.filter(p => p !== permissionToRemove);

//       // Delete if no permissions remain, otherwise update
//       if (updatedPermissions.length === 0) {
//         await tx.rolePermission.delete({
//           where: { workspaceId_role: { workspaceId, role } },
//         });
//       } else {
//         await tx.rolePermission.update({
//           where: { workspaceId_role: { workspaceId, role } },
//           data: { permission: updatedPermissions },
//         });
//       }

//       return true;
//     });
//   },
//   exportWorkspaceData: async (
//     workspaceId: number,
//     userPage: number = 1,
//     userPageSize: number = 10,
//     invitationPage: number = 1,
//     invitationPageSize: number = 10
//   ) => {
//     try {
//       const workspace = await prisma.workspace.findUnique({
//         where: { id: workspaceId },
//         select: {
//           id: true,
//           name: true,
//           slug: true,
//           description: true,
//           openingTime: true,
//           closingTime: true,
//           isActive: true,
//           createdAt: true,
//           updatedAt: true,
//           // Fetch paginated users
//           users: {
//             skip: (userPage - 1) * userPageSize,
//             take: userPageSize,
//             select: {
//               id: true,
//               firstName: true,
//               lastName: true,
//               email: true,
//               role: true,
//               status: true,
//               phone: true,
//             },
//           },
//           // Fetch paginated invitations
//           invitations: {
//             skip: (invitationPage - 1) * invitationPageSize,
//             take: invitationPageSize,
//             select: {
//               id: true,
//               email: true,
//               status: true,
//               role: true,
//               createdAt: true,
//               acceptedAt: true,
//             },
//           },
//         },
//       });

//       if (!workspace) throw new Error('Workspace not found');

//       // Count total for pagination
//       const [userCount, invitationCount] = await Promise.all([
//         prisma.user.count({
//           where: {
//             workspaces: {
//               some: {
//                 id: workspaceId,
//               },
//             },
//           },
//         }),
//         prisma.invitation.count({
//           where: {
//             workspaceId,
//           },
//         }),
//       ]);

//       return {
//         workspace,
//         pagination: {
//           users: {
//             page: userPage,
//             pageSize: userPageSize,
//             total: userCount,
//           },
//           invitations: {
//             page: invitationPage,
//             pageSize: invitationPageSize,
//             total: invitationCount,
//           },
//         },
//       };
//     } catch (error) {
//       console.error('❌ Service error exporting workspace data:', error);
//       throw new Error('Failed to export workspace data');
//     }
//   }

// };

import { InvitationStatus, NotificationType, Prisma, Role } from '@prisma/client';
import { InviteData, WorkspaceInput } from '../types/workspace.types';
import prisma from '../util/prisma';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import bcrypt from 'bcryptjs';
import { SearchParams } from '../types/types';
import sendEmail from '../util/sendEmail';
import redisClient from '../cache/redisClient';
import { sendNotificationToUsers } from '../util/pushNotification';
import { io } from '../server';

export const workspaceService = {
  createWorkspace: async (userId: string, data: WorkspaceInput) => {
    // Validate input
    if (!userId || !data.name?.trim()) {
      throw new Error('User ID and workspace name are required');
    }

    const baseName = data.name.trim();

    // Check for existing workspace
    const existing = await prisma.workspace.findUnique({ where: { name: baseName } });
    if (existing) {
      throw new Error(`Workspace "${baseName}" already exists`);
    }

    // Generate unique slug
    const slug = `${slugify(baseName, { lower: true })}-${uuidv4().slice(0, 6)}`;

    // Create workspace and assign ADMIN role to the creator
    const workspace = await prisma.$transaction(async (tx) => {
      const newWorkspace = await tx.workspace.create({
        data: {
          name: baseName,
          slug,
          description: data.description?.trim() ?? null,
          images: Array.isArray(data.images) ? data.images : [],
          openingTime: data.openingTime ?? null,
          closingTime: data.closingTime ?? null,
          isActive: data.isActive ?? true,
          owner: { connect: { id: userId } },
          users: { connect: { id: userId } }, // Add creator to workspace users
        },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true, UserRole: true },
          },
        },
      });

      // Assign ADMIN role to the creator
      await tx.userRole.create({
        data: {
          userId,
          workspaceId: newWorkspace.id,
          role: Role.ADMIN,
        },
      });

      return newWorkspace;
    });

    return workspace;
  },

  createWorkspaceWithAssignRole: async (userId: string, data: WorkspaceInput) => {
    if (!userId || !data.name?.trim()) {
      throw new Error('User ID and workspace name are required');
    }

    const baseName = data.name.trim();
    const existing = await prisma.workspace.findUnique({ where: { name: baseName } });
    if (existing) {
      throw new Error(`Workspace "${baseName}" already exists`);
    }

    const slug = `${slugify(baseName, { lower: true })}-${uuidv4().slice(0, 6)}`;

    const workspace = await prisma.$transaction(async (tx) => {
      const newWorkspace = await tx.workspace.create({
        data: {
          name: baseName,
          slug,
          description: data.description?.trim() ?? null,
          images: Array.isArray(data.images) ? data.images : [],
          openingTime: data.openingTime ?? null,
          closingTime: data.closingTime ?? null,
          isActive: data.isActive ?? true,
          owner: { connect: { id: userId } },
          users: { connect: { id: userId } },
        },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      await tx.userRole.create({
        data: {
          userId,
          workspaceId: newWorkspace.id,
          role: Role.ADMIN,
        },
      });

      return newWorkspace;
    });

    return workspace;
  },

  getAdminWorkspaces: async (userId: string) => {
    try {
      return await prisma.workspace.findMany({
        where: {
          UserRole: {
            some: {
              userId,
              role: Role.ADMIN,
            },
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
    } catch (error) {
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
        description: true,
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

  updateWorkspace: async (workspaceId: number, userId: string, data: Partial<WorkspaceInput>) => {
    // Check if the user is an ADMIN in this workspace
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        workspaceId,
        role: Role.ADMIN,
      },
    });

    if (!userRole) {
      throw new Error('Unauthorized: Only admins can update this workspace');
    }
    console.log("dfgdG", data.closingTime);

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return workspace;
  },

  // deleteWorkspaces: async (workspaceIds: number[], userId: string) => {
  //   const workspaces = await prisma.workspace.findMany({
  //     where: {
  //       id: { in: workspaceIds },
  //       UserRole: {
  //         some: {
  //           userId,
  //           role: Role.ADMIN,
  //         },
  //       },
  //     },
  //     select: { id: true },
  //   });

  //   const foundIds = workspaces.map(ws => ws.id);
  //   const notFoundIds = workspaceIds.filter(id => !foundIds.includes(id));

  //   if (notFoundIds.length > 0) {
  //     throw new Error(`Some workspaces not found or not owned by user: ${notFoundIds.join(', ')}`);
  //   }

  //   await prisma.$transaction([
  //     prisma.rolePermission.deleteMany({
  //       where: { workspaceId: { in: workspaceIds } },
  //     }),
  //     prisma.category.deleteMany({
  //       where: { workspaceId: { in: workspaceIds } },
  //     }),
  //     prisma.invitation.deleteMany({
  //       where: { workspaceId: { in: workspaceIds } },
  //     }),
  //     prisma.userRole.deleteMany({
  //       where: { workspaceId: { in: workspaceIds } },
  //     }),
  //     prisma.workspace.deleteMany({
  //       where: { id: { in: workspaceIds } },
  //     }),
  //   ]);
  // },
  deleteWorkspaces: async (workspaceIds: number[], userId: string) => {
    const workspaces = await prisma.workspace.findMany({
      where: {
        id: { in: workspaceIds },
        UserRole: {
          some: {
            userId,
            role: Role.ADMIN,
          },
        },
      },
      select: { id: true },
    });

    const foundIds = workspaces.map(ws => ws.id);
    const notFoundIds = workspaceIds.filter(id => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new Error(`Some workspaces not found or not owned by user: ${notFoundIds.join(', ')}`);
    }

    // Soft delete instead of actual delete
    await prisma.workspace.updateMany({
      where: {
        id: { in: foundIds },
      },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });
  },
  // deleteWorkspaceById: async (workspaceId: number, userId: string): Promise<void> => {
  //   const userRole = await prisma.userRole.findFirst({
  //     where: {
  //       userId,
  //       workspaceId,
  //       role: Role.ADMIN,
  //     },
  //   });

  //   if (!userRole) {
  //     throw new Error('You are not authorized to delete this workspace.');
  //   }

  //   await prisma.$transaction([
  //     prisma.rolePermission.deleteMany({ where: { workspaceId } }),
  //     prisma.category.deleteMany({ where: { workspaceId } }),
  //     prisma.invitation.deleteMany({ where: { workspaceId } }),
  //     prisma.userRole.deleteMany({ where: { workspaceId } }),
  //     prisma.workspace.delete({ where: { id: workspaceId } }),
  //   ]);
  // },

  deleteWorkspaceById: async (workspaceId: number, userId: string): Promise<void> => {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        workspaceId,
        role: Role.ADMIN,
      },
    });

    if (!userRole) {
      throw new Error('You are not authorized to delete this workspace.');
    }

    // Soft delete instead of actual delete
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });
  },
  removeUserFromWorkspace: async (workspaceId: number, email: string, currentUserId: string): Promise<string> => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const currentUserRole = await prisma.userRole.findFirst({
      where: {
        userId: currentUserId,
        workspaceId,
        role: { in: [Role.ADMIN, Role.MANAGER] },
      },
    });

    if (!currentUserRole) {
      throw new Error('Only admins or managers can remove users');
    }

    const userToRemove = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToRemove) {
      throw new Error('User not found');
    }

    // Check if user is associated with the workspace
    const isInWorkspace = await prisma.userRole.findFirst({
      where: {
        userId: userToRemove.id,
        workspaceId,
      },
    });

    if (!isInWorkspace) {
      throw new Error('User is not a member of this workspace');
    }

    // Prevent removing the owner or self
    if (userToRemove.id === workspace.ownerId) {
      throw new Error('Cannot remove the workspace owner');
    }
    if (userToRemove.id === currentUserId) {
      throw new Error('Cannot remove yourself from the workspace');
    }

    // Remove the user from the workspace
    await prisma.userRole.deleteMany({
      where: {
        userId: userToRemove.id,
        workspaceId,
      },
    });

    return `User ${email} has been removed from the workspace`;
  },

  // inviteUserToWorkspace: async ({ email, role, workspaceId }: InviteData, invitedById: string) => {
  //   const [
  //     workspace,
  //     existingInvite,
  //     existingUser,
  //   ] = await Promise.all([
  //     prisma.workspace.findUnique({
  //       where: { id: workspaceId },
  //       select: { id: true, name: true, ownerId: true },
  //     }),
  //     prisma.invitation.findFirst({
  //       where: { email, workspaceId, status: InvitationStatus.PENDING },
  //     }),
  //     prisma.user.findUnique({
  //       where: { email },
  //       select: { id: true, firstName: true },
  //     }),
  //   ]);

  //   // Validations
  //   if (!workspace) throw new Error('Workspace not found');
  //   if (workspace.ownerId !== invitedById) throw new Error('Only the workspace owner can invite users');
  //   if (existingInvite) throw new Error('Pending invitation already exists for this user');

  //   // Check if user already in workspace (only if user exists)
  //   if (existingUser) {
  //     const isInWorkspace = await prisma.userRole.findFirst({
  //       where: {
  //         userId: existingUser.id,
  //         workspaceId,
  //       },
  //     });
  //     if (isInWorkspace) throw new Error('User is already part of this workspace');
  //   }

  //   // Create user if not exists
  //   let invitedUserId = existingUser?.id;
  //   let firstName = existingUser?.firstName ?? 'User';
  //   let tempPassword = uuidv4().slice(0, 8); // always needed for invitation

  //   if (!existingUser) {
  //     const hashedPassword = await bcrypt.hash(tempPassword, 10);
  //     const newUser = await prisma.user.create({
  //       data: {
  //         email,
  //         password: hashedPassword,
  //         isActive: true,
  //         firstName: 'Invited',
  //         lastName: 'User',
  //       },
  //       select: { id: true, firstName: true },
  //     });
  //     invitedUserId = newUser.id;
  //     firstName = newUser.firstName;
  //   }

  //   // Create invitation
  //   const inviteToken = uuidv4();
  //   const [invitation] = await Promise.all([
  //     prisma.invitation.create({
  //       data: {
  //         email,
  //         tempPassword,
  //         inviteToken,
  //         status: InvitationStatus.PENDING,
  //         role,
  //         workspaceId,
  //         invitedById,
  //         invitedUserId,
  //         expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  //       },
  //     }),
  //     // Email can be prepared in parallel (sending only after db ops complete)
  //     sendEmail(
  //       email,
  //       `Invitation to join ${workspace.name}`,
  //       `
  //       <!DOCTYPE html>
  //       <html>
  //         <head><meta charset="UTF-8" /></head>
  //         <body style="font-family: Arial, sans-serif; background: #f6f6f6; padding: 20px;">
  //           <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px;">
  //             <h2 style="color: #333;">👋 You're Invited!</h2>
  //             <p>Hi <strong>${firstName}</strong>,</p>
  //             <p>You’ve been invited to join <strong>${workspace.name}</strong> as a <strong>${role}</strong>.</p>
  //             <p>Your temporary password is: <strong style="background: #f0f0f0; padding: 5px; border-radius: 3px;">${tempPassword}</strong></p>
  //             <p>Please log in and update your password.</p>
  //             <a href="${process.env.SERVER_URL}/api/v1/workspaces/invitation/accept/${inviteToken}"
  //                style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
  //               Accept Invitation
  //             </a>
  //             <p style="font-size: 12px; color: #999;">Backey Management © ${new Date().getFullYear()}</p>
  //           </div>
  //         </body>
  //       </html>
  //       `
  //     ),
  //   ]);

  //   return invitation;
  // },

  inviteUserToWorkspace: async (
    { email, role, workspaceId }: InviteData,
    invitedById: string
  ) => {
    const [
      workspace,
      existingInvite,
      existingUser,
    ] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, ownerId: true },
      }),
      prisma.invitation.findFirst({
        where: { email, workspaceId, status: 'PENDING' },
      }),
      prisma.user.findUnique({
        where: { email },
        select: { id: true, firstName: true },
      }),
    ]);

    // Validations
    if (!workspace) throw new Error('Workspace not found');
    if (workspace.ownerId !== invitedById) throw new Error('Only the workspace owner can invite users');
    if (existingInvite) throw new Error('Pending invitation already exists for this user');

    // Check if user already in workspace (only if user exists)
    if (existingUser) {
      const isInWorkspace = await prisma.userRole.findFirst({
        where: {
          userId: existingUser.id,
          workspaceId,
        },
      });
      if (isInWorkspace) throw new Error('User is already part of this workspace');
    }

    // Create user if not exists
    let invitedUserId = existingUser?.id;
    let firstName = existingUser?.firstName ?? 'User';
    let tempPassword = uuidv4().slice(0, 8); // always needed for invitation

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
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
    const [invitation] = await Promise.all([
      prisma.invitation.create({
        data: {
          email,
          tempPassword,
          inviteToken,
          status: 'PENDING',
          role,
          workspaceId,
          invitedById,
          invitedUserId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      // Email can be prepared in parallel (sending only after db ops complete)
      sendEmail(
        email,
        `Invitation to join ${workspace.name}`,
        `<!DOCTYPE html>
          <html>
            <head><meta charset="UTF-8" /></head>
            <body style="font-family: Arial, sans-serif; background: #f6f6f6; padding: 20px;">
              <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #333;">👋 You're Invited!</h2>
                <p>Hi <strong>${firstName}</strong>,</p>
                <p>You’ve been invited to join <strong>${workspace.name}</strong> as a <strong>${role}</strong>.</p>
                <p>Your temporary password is: <strong style="background: #f0f0f0; padding: 5px; border-radius: 3px;">${tempPassword}</strong></p>
                <p>Please log in and update your password.</p>
                <a href="${process.env.SERVER_URL}/api/v1/workspaces/invitation/accept/${inviteToken}"
                   style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
                  Accept Invitation
                </a>
                <p style="font-size: 12px; color: #999;">Backey Management © ${new Date().getFullYear()}</p>
              </div>
            </body>
          </html>`
      ),
      // Creating a notification for the invited user
      // prisma.notification.create({
      //   data: {
      //     userId: invitedUserId!,
      //     workspaceId: workspace.id,
      //     title: 'Workspace Invitation',
      //     message: `You have been invited to join the workspace ${workspace.name} as a ${role}. Please check your email for further details.`,
      //     type: 'INVITATION',
      //     isRead: false,
      //   },
      // }),
    ]);

    // 📣 Push the notification using socket or background notifier
    await sendNotificationToUsers(
      workspace.id,
      [invitedUserId!],
      {
        userId: invitedUserId!,
        title: 'Workspace Invitation',
        message: `You’ve been invited to ${workspace.name} as a ${role} and its workspaceId is ${workspace.id}.`,
        type: "INVITATION",
      },
      io
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
        role: true,
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
    await prisma.$transaction([
      prisma.invitation.update({
        where: { inviteToken },
        data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
      }),
      prisma.userRole.create({
        data: {
          userId: invitation.invitedUserId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
        },
      }),
    ]);

    return { id: invitation.workspaceId };
  },

  getInvitations: async (userId: string) => {
    return prisma.invitation.findMany({
      where: { invitedUserId: userId, status: InvitationStatus.PENDING },
      include: { workspace: true },
    });
  },

  // setRolesPermissionService: async (
  //   workspaceId: number,
  //   role: Role,
  //   permissions: string[],
  //   userId: string
  // ) => {
  //   // Validate workspace and ownership
  //   const workspace = await prisma.workspace.findUnique({
  //     where: { id: workspaceId },
  //     select: { id: true, ownerId: true },
  //   });

  //   if (!workspace) throw new Error('Workspace not found');
  //   if (workspace.ownerId !== userId) throw new Error('Only the workspace owner can assign permissions');

  //   // Upsert role permission
  //   return prisma.rolePermission.upsert({
  //     where: { workspaceId_role: { workspaceId, role } },
  //     update: {
  //       permission: { set: permissions }, // Replace existing permissions
  //     },
  //     create: {
  //       workspaceId,
  //       role,
  //       permission: permissions,
  //     },
  //   });
  // },

  setRolesPermissionService: async (
    workspaceId: number,
    role: Role,
    permissions: string[],
    userId: string
  ) => {
    // Fetch existing permissions
    const existing = await prisma.rolePermission.findUnique({
      where: {
        workspaceId_role: {
          workspaceId,
          role,
        },
      },
    });

    // Merge & dedupe permissions if existing ones are found
    const updatedPermissions = existing
      ? Array.from(new Set([...existing.permission, ...permissions]))
      : permissions;

    await prisma.rolePermission.upsert({
      where: {
        workspaceId_role: {
          workspaceId,
          role,
        },
      },
      update: {
        permission: updatedPermissions,
      },
      create: {
        workspaceId,
        role,
        permission: updatedPermissions,
      },
    });
  },
  getWorkspaceUsers: async (workspaceId: number, userId: string) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        UserRole: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                status: true,
                isActive: true,
                profileImageUrl: true,
              },
            },
            role: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        workspaceId,
        role: Role.ADMIN,
      },
    });
    if (!userRole && workspace.ownerId !== userId) {
      throw new Error('Unauthorized: Only admins or owners can view users');
    }

    return workspace.UserRole.map((ur) => ({
      ...ur.user,
      role: ur.role,
    }));
  },

  getWorkspacesByUserId: async (userId: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const workspaces = await prisma.workspace.findMany({
        where: {
          UserRole: {
            some: {
              userId,
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
      console.error('Error fetching workspaces:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
      console.error('Service error toggling workspace status:', error);
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
      console.error('Service error fetching role permissions:', error);
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
      const rolePermission = await tx.rolePermission.findUnique({
        where: { workspaceId_role: { workspaceId, role } },
      });

      if (!rolePermission) throw new Error('Role permission not found');

      if (!rolePermission.permission.includes(permissionToRemove)) return null;

      const updatedPermissions = rolePermission.permission.filter(p => p !== permissionToRemove);

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
          UserRole: {
            skip: (userPage - 1) * userPageSize,
            take: userPageSize,
            select: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  status: true,
                  phone: true,
                },
              },
              role: true,
            },
          },
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
        prisma.userRole.count({
          where: {
            workspaceId,
          },
        }),
        prisma.invitation.count({
          where: {
            workspaceId,
          },
        }),
      ]);

      return {
        workspace: {
          ...workspace,
          users: workspace.UserRole.map((ur) => ({
            ...ur.user,
            role: ur.role,
          })),
        },
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
      console.error('Service error exporting workspace data:', error);
      throw new Error('Failed to export workspace data');
    }
  },
};