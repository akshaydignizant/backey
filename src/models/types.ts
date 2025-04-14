import { Role, InvitationStatus, Workspace, User, Prisma } from '@prisma/client';

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
}

export type WorkspaceWithOwner = Prisma.WorkspaceGetPayload<{
  include: { owner: true };
}>;

export interface AdminWorkspaceResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  images: string[];
  openingTime: string | null;
  closingTime: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    role: Role | null;
  };
}

export interface WorkspaceInput {
  name: string;
  description?: string;
  images?: string[];
  openingTime?: string;
  closingTime?: string;
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