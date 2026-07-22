import type { StoreProduct, StoreProductListItem } from "@/lib/store/types";

export function getProductDisplayName(product: {
  nameAr: string | null;
  name: string;
}): string {
  return product.nameAr?.trim() || product.name;
}

export function getCategoryDisplayName(category: {
  nameAr: string | null;
  name: string;
}): string {
  return category.nameAr?.trim() || category.name;
}

export function getProductPriceRange(product: StoreProductListItem): {
  min: number;
  max: number;
} {
  const prices = product.variants
    .map((variant) => variant.sellingPrice)
    .filter((price) => Number.isFinite(price));

  if (prices.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function isProductInStock(product: StoreProductListItem): boolean {
  return product.variants.some((variant) => variant.stockQuantity > 0);
}

export function getVariantStockForColor(
  product: StoreProduct,
  color: string
): number {
  return product.variants
    .filter((variant) => variant.color === color)
    .reduce((sum, variant) => sum + variant.stockQuantity, 0);
}

export function getAvailableSizesForColor(
  product: StoreProduct,
  color: string
): {
  size: string;
  inStock: boolean;
  stockQuantity: number;
  variantId: string;
  price: number;
  images: { id: string; url: string; altText: string | null }[];
}[] {
  const seen = new Map<
    string,
    {
      size: string;
      inStock: boolean;
      stockQuantity: number;
      variantId: string;
      price: number;
      images: { id: string; url: string; altText: string | null }[];
    }
  >();

  for (const variant of product.variants) {
    if (variant.color !== color) continue;

    const existing = seen.get(variant.size);
    const entry = {
      size: variant.size,
      stockQuantity: variant.stockQuantity,
      inStock: variant.stockQuantity > 0,
      variantId: variant.id,
      price: variant.sellingPrice,
      images: variant.images
        .filter((item) => item.isActive)
        .map((item) => ({
          id: item.id,
          url: item.url,
          altText: item.altText,
        })),
    };

    if (!existing || variant.stockQuantity > existing.stockQuantity) {
      seen.set(variant.size, entry);
    }
  }

  return Array.from(seen.values());
}

export function getPrimaryImageUrl(product: StoreProductListItem): string | null {
  const productPrimary = product.images.find((item) => item.isPrimary && item.isActive);
  if (productPrimary?.url) return productPrimary.url;

  const productFirst = product.images.find((item) => item.isActive);
  if (productFirst?.url) return productFirst.url;

  for (const color of product.colors) {
    const primary = color.media.find((item) => item.isPrimary && item.isActive);
    if (primary?.url) return primary.url;

    const first = color.media.find((item) => item.isActive);
    if (first?.url) return first.url;
  }

  return product.imageUrl ?? null;
}

export function getProductImages(
  product: StoreProduct
): { id: string; url: string; altText: string | null }[] {
  return product.images
    .filter((item) => item.isActive)
    .map((item) => ({
      id: item.id,
      url: item.url,
      altText: item.altText,
    }));
}

export function getColorMedia(
  product: StoreProduct,
  colorName: string
): { id: string; url: string; altText: string | null }[] {
  const color = product.colors.find((item) => item.color === colorName);
  if (!color) return [];

  return color.media
    .filter((item) => item.isActive)
    .map((item) => ({
      id: item.id,
      url: item.url,
      altText: item.altText,
    }));
}

export function getDefaultColor(product: StoreProduct): string | null {
  const withMedia = product.colors.find((color) => color.media.some((m) => m.isActive));
  if (withMedia) return withMedia.color;

  const withStock = product.variants.find((variant) => variant.stockQuantity > 0);
  if (withStock) return withStock.color;

  return product.colors[0]?.color ?? product.variants[0]?.color ?? null;
}

/** Public storefront product detail — singular `/store/product/` matches the actual route */
export function getStoreProductPath(productId: string): string {
  return `/store/product/${productId}`;
}

/** Admin dashboard product edit/detail */
export function getAdminProductPath(productId: string): string {
  return `/products/${productId}`;
}

export function getProductPath(
  productId: string,
  options?: { isDashboard?: boolean }
): string {
  return options?.isDashboard
    ? getAdminProductPath(productId)
    : getStoreProductPath(productId);
}

/** Public storefront category detail — matches the actual route under /store/categories/[id] */
export function getCategoryPath(categoryId: string): string {
  return `/store/categories/${categoryId}`;
}
