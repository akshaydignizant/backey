// Address.ts
export interface Address {
  id: string;
  userId: string;
  label?: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
