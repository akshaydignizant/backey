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

export interface ProductStatsRaw {
  total: bigint;
  active: bigint;
  inactive: bigint;
}

export interface VariantStatsRaw {
  total: bigint;
  available: bigint;
  out_of_stock: bigint;
}