import { Role } from '@prisma/client';

export type WorkspaceInput = {
  name: string;
  description?: string;
  images?: string[];
  openingTime?: string;
  closingTime?: string;
  isActive?: boolean;
};

export interface InviteData {
  email: string;
  role: Role;
  workspaceId: number;
}