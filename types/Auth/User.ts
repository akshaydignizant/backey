export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: 'customer' | 'staff' | 'manager';
  createdAt: Date;
  updatedAt: Date;
}