export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: 'M-Pesa' | 'E-Mola' | 'Cash';
  status: 'Pending' | 'Processing' | 'Delivered' | 'Cancelled';
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
}
