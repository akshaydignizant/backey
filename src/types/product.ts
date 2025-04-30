export interface ProductVariantInput {
  title: string;
  sku: string;
  price: number;
  stock: number;
  weight?: number;
  dimensions?: string;
  color?: string;
  size?: string;
};

export interface ProductInput {
  name: string;
  description: string;
  isActive?: boolean;
  images?: string[];
  categoryId?: string;
  variants?: ProductVariantInput[];
};


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