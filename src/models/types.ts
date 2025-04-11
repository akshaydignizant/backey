import { Role, InvitationStatus, Workspace, User, Board } from '@prisma/client';

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
}

export interface WorkspaceInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface InviteUserInput {
  email: string;
  role: Role; // If you have enum imported, else use string
  boardId: number;
  workspaceId: number;
}

export interface WorkspaceResponse {
  success: boolean;
  data?: Workspace | null;
  message?: string;
}

export interface BoardInput {
  name: string;
  address?: string;
}