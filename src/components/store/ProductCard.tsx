import Image from "next/image";
import Link from "next/link";
import { optimizeCloudinaryUrl, STORE_IMAGE_SIZES } from "@/lib/store/images";
import {
  getAdminProductPath,
  getPrimaryImageUrl,
  getProductDisplayName,
  getProductPriceRange,
  getStoreProductPath,
  isProductInStock,
} from "@/lib/store/product-utils";
import type { StoreProductListItem } from "@/lib/store/types";
import { formatCurrency } from "@/lib/utils";
import ColorSwatches from "@/components/store/ColorSwatches";

type ProductCardProps = {
  product: StoreProductListItem;
  currencySymbol?: string;
  priority?: boolean;
  /** Set true only when rendering inside the admin dashboard */
  isDashboard?: boolean;
};

export default function ProductCard({
  product,
  currencySymbol = "ج.م",
  priority = false,
  isDashboard = false,
}: ProductCardProps) {
  const imageUrl = getPrimaryImageUrl(product);
  const { min, max } = getProductPriceRange(product);
  const inStock = isProductInStock(product);
  const displayName = getProductDisplayName(product);
  const href = isDashboard
    ? getAdminProductPath(product.id)
    : getStoreProductPath(product.id);

  const optimizedUrl = imageUrl
    ? optimizeCloudinaryUrl(imageUrl, {
        width: STORE_IMAGE_SIZES.card.width,
        height: STORE_IMAGE_SIZES.card.height,
        crop: "fill",
      })
    : null;

  return (
    <article className="group rounded-[1.9rem] border border-[var(--store-border)] bg-[linear-gradient(135deg,rgba(255,250,243,1),rgba(252,247,239,0.96))] p-2.5 shadow-[0_16px_45px_rgba(80,54,28,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(80,54,28,0.13)]">
      <Link href={href} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.45rem] bg-[var(--store-surface)]">
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
          <div className="absolute inset-x-3 top-3 flex items-center justify-between">
            <span className="rounded-full border border-white/30 bg-white/80 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[var(--store-gold)] backdrop-blur">
              {product.category?.nameAr || product.category?.name || "مميزة"}
            </span>
            <span className="rounded-full border border-[var(--store-border)] bg-[var(--store-surface)]/90 px-2.5 py-1 text-[10px] text-[var(--store-muted)]">
              جديد
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2 px-2 pb-2">
          {product.category && (
            <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-muted)]">
              {product.category.nameAr || product.category.name}
            </p>
          )}
          <h3 className="store-serif text-[1.05rem] font-semibold text-[var(--store-text)] transition group-hover:text-[var(--store-gold)]">
            {displayName}
          </h3>
          <p className="text-sm font-medium text-[var(--store-gold)]">
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
