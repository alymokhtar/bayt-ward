import Image from "next/image";
import Link from "next/link";
import { optimizeCloudinaryUrl, STORE_IMAGE_SIZES } from "@/lib/store/images";
import {
  getPrimaryImageUrl,
  getProductDisplayName,
  getProductPath,
  getProductPriceRange,
  isProductInStock,
} from "@/lib/store/product-utils";
import type { StoreProductListItem } from "@/lib/store/types";
import { formatCurrency } from "@/lib/utils";
import ColorSwatches from "@/components/store/ColorSwatches";

type ProductCardProps = {
  product: StoreProductListItem;
  currencySymbol?: string;
  priority?: boolean;
};

export default function ProductCard({
  product,
  currencySymbol = "ج.م",
  priority = false,
}: ProductCardProps) {
  const imageUrl = getPrimaryImageUrl(product);
  const { min, max } = getProductPriceRange(product);
  const inStock = isProductInStock(product);
  const displayName = getProductDisplayName(product);
  const href = getProductPath(product.id);

  const optimizedUrl = imageUrl
    ? optimizeCloudinaryUrl(imageUrl, {
        width: STORE_IMAGE_SIZES.card.width,
        height: STORE_IMAGE_SIZES.card.height,
        crop: "fill",
      })
    : null;

  return (
    <article className="group">
      <Link href={href} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-[var(--store-surface)]">
          {optimizedUrl ? (
            <Image
              src={optimizedUrl}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="store-image-zoom object-cover"
              priority={priority}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--store-border)] text-sm text-[var(--store-muted)]">
              لا توجد صورة
            </div>
          )}
          {!inStock && (
            <span className="absolute inset-x-3 bottom-3 rounded-full bg-black/70 px-3 py-1 text-center text-xs text-white">
              غير متوفر
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {product.category && (
            <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-muted)]">
              {product.category.nameAr || product.category.name}
            </p>
          )}
          <h3 className="text-base font-medium text-[var(--store-text)] transition group-hover:text-[var(--store-gold)]">
            {displayName}
          </h3>
          <p className="text-sm text-[var(--store-text)]">
            {min === max
              ? formatCurrency(min, currencySymbol)
              : `${formatCurrency(min, currencySymbol)} – ${formatCurrency(max, currencySymbol)}`}
          </p>
          <ColorSwatches
            colors={product.colors.map((color) => ({
              name: color.color,
              hex: color.colorHex,
            }))}
            size="sm"
          />
        </div>
      </Link>
    </article>
  );
}
