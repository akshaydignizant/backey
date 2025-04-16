export interface ProductInput {
  name: string;
  description: string;
  categoryId: string;
  imageUrl?: string;
  images?: string[];
  stockQuantity?: number;
  variants?: VariantInput[];
}

export interface VariantInput {
  title: string;
  sku: string;
  price: number;
  stock: number;
  weight?: number;
  dimensions?: string;
  color?: string;
  size?: string;
}
