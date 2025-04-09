import { Role } from "@prisma/client";

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}