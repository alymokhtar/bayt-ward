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

export function isLikelyVariantCodeQuery(value: string): boolean {
  const q = value.trim();
  if (!q) return false;

  if (/\s/.test(q) || /[\u0600-\u06FF]/.test(q)) {
    return false;
  }

  if (/^\d+$/.test(q)) return true;
  if (/^(?:BC|BW)-[A-Z0-9]+$/i.test(q)) return true;
  if (/[0-9]/.test(q) && /^[A-Za-z0-9-]+$/.test(q)) return true;

  return false;
}

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
