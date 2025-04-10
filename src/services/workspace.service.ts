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
        users: { connect: { id: userId } },
      },
      include: { owner: true, users: true },
    });
  },

  getWorkspace: async (workspaceId: number, userId: string) => {
    return prisma.workspace.findFirst({
      where: { id: workspaceId, users: { some: { id: userId } } },
      include: { owner: true, users: true, boards: true, products: true },
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

  inviteUserToWorkspace: async (workspaceId: number, invitedById: string, data: InviteUserInput) => {
    const { email, role, boardId } = data;

    // Check for duplicate invitations
    const existing = await prisma.invitation.findFirst({
      where: {
        email,
        workspaceId,
        status: InvitationStatus.PENDING,
      },
    });
    if (existing) throw new Error('User already invited');

    const inviteToken = uuidv4();
    const tempPassword = uuidv4();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return prisma.invitation.create({
      data: {
        email,
        tempPassword: hashedPassword,
        inviteToken,
        status: InvitationStatus.PENDING,
        role,
        workspace: { connect: { id: workspaceId } },
        board: { connect: { id: boardId } },
        invitedBy: { connect: { id: invitedById } },
        expiresAt,
      },
    });
  },

  getWorkspaceUsers: async (workspaceId: number, userId: string) => {
    const workspace = await workspaceService.getWorkspace(workspaceId, userId);
    if (!workspace) throw new Error('Workspace not found or no access');

    return prisma.user.findMany({
      where: { workspaces: { some: { id: workspaceId } } },
    });
  },

  createBoard: async (workspaceId: number, userId: string, data: BoardInput) => {
    const workspace = await workspaceService.getWorkspace(workspaceId, userId);
    if (!workspace) throw new Error('Workspace not found or no access');

    if (!data.address) throw new Error("Board address is required"); // ⛔ explicitly enforce

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
