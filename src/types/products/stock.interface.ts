export interface IProductVariant {
  id: string;
  title: string;
  sku: string;
  price: number;
  stock: number;
  weight: number | null; // Allow null
  dimensions: string | null; // Allow null
  color: string | null; // Allow null
  size: string | null; // Allow null
  isAvailable: boolean;
  productId: string;
}

export interface IStockUpdate {
  variantId: string;
  quantity: number;
  action: 'increment' | 'decrement' | 'set';
}

export interface IStockFilter {
  productId?: string;
  minStock?: number;
  maxStock?: number;
  isAvailable?: boolean;
}