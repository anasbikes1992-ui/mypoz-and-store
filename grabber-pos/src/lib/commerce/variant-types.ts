export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  salePrice: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  barcode: string | null;
  imageUrl: string | null;
  position: number;
  quantity: number;
  isActive: boolean;
}

export type VariantDraft = Omit<ProductVariant, "id" | "productId"> & {
  id?: string;
  productId?: string;
};
