export type ProductSearchVariant = {
  id: string;
  sku: string;
  barcode: string | null;
  size: string;
  color: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  isActive?: boolean;
};

export type ProductSearchRow = {
  id: string;
  name: string;
  nameAr: string | null;
  variants: ProductSearchVariant[];
};

export function flattenProductSearchResults(products: ProductSearchRow[]) {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({
      ...variant,
      product: {
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
      },
    }))
  );
}
