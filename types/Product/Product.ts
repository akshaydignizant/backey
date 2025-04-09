export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  category: Category;
  variants: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}