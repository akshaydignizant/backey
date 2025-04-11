import { InvitationStatus, Role } from "@prisma/client";
import { BoardInput, InviteUserInput, WorkspaceInput } from "../models/types";
import prisma from "../util/prisma";
import { v4 as uuidv4 } from 'uuid';
import slugify from "slugify";
import bcrypt from 'bcryptjs';

export const workspaceService = {
  createWorkspace: async (userId: string, data: WorkspaceInput) => {
    const slug = `${slugify(data.name, { lower: true })}-${uuidv4().slice(0, 6)}`;
    return prisma.workspace.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        slug,
        owner: { connect: { id: userId } },
        // users: { connect: { id: userId } },
      },
      include: { owner: true },
    });
  },

  getWorkspace: async (workspaceId: number) => {
    return prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: true,
        users: true,
        boards: true,
        products: true,
        categories: true,
        stores: true,
        rolePermissions: true,
        Invitation: true,
      },
    });
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

  inviteUserToWorkspace: async (data: InviteUserInput, invitedById: string) => {
    const tempPassword = uuidv4().slice(0, 8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const inviteToken = uuidv4();

    // Check if a pending invitation already exists for this email
    const existingInvite = await prisma.invitation.findUnique({
      where: { email: data.email },
    });

    if (existingInvite) {
      throw new Error('Invitation already sent to this email');
    }

    // Check if user already exists
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
          firstName: 'Invited', // Use defaults or values from `data`
          lastName: 'User',
        },
      });
      invitedUserId = newUser.id;
    }

    return prisma.invitation.create({
      data: {
        email: data.email,
        tempPassword,
        inviteToken,
        status: 'PENDING',
        role: data.role,
        workspaceId: data.workspaceId,
        boardId: data.boardId,
        invitedById,
        invitedUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  },

  acceptInvitation: async (token: string) => {
    const invitation = await prisma.invitation.findUnique({ where: { inviteToken: token } });

    if (!invitation) throw new Error("Invitation not found or expired");

    return prisma.invitation.update({
      where: { inviteToken: token },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  },

  getWorkspaceUsers: async (workspaceId: number, userId: string) => {
    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (!workspace) throw new Error('Workspace not found or no access');

    return prisma.user.findMany({
      where: { workspaces: { some: { id: workspaceId } } },
    });
  },

  createBoard: async (workspaceId: number, userId: string, data: BoardInput) => {
    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (!workspace) throw new Error('Workspace not found or no access');

    if (!data.address) throw new Error("Board address is required");

    return prisma.board.create({
      data: {
        name: data.name,
        address: data.address, // ✅ guaranteed to be string
        workspace: { connect: { id: workspaceId } },
      },
      include: { workspace: true },
    });
  },


  addUserToBoard: async (boardId: number, userId: string, targetUserId: string, role: Role) => {
    const board = await prisma.board.findFirst({
      where: { id: boardId, workspace: { users: { some: { id: userId } } } },
    });

    if (!board) throw new Error('Board not found or no access');

    return prisma.boardUser.create({
      data: {
        user: { connect: { id: targetUserId } },
        board: { connect: { id: boardId } },
        role,
      },
    });
  },
};
