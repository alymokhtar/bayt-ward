import Image from "next/image";
import Link from "next/link";
import FavoriteButton from "@/components/store/FavoriteButton";
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

type ProductCardProps = {
  product: StoreProductListItem;
  currencySymbol?: string;
  priority?: boolean;
  /** Set true only when rendering inside the admin dashboard */
  isDashboard?: boolean;
};

export default function ProductCard({
  product,
  currencySymbol = "MRU",
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
  const priceLabel =
    min === max
      ? formatCurrency(min, currencySymbol)
      : `${formatCurrency(min, currencySymbol)} - ${formatCurrency(max, currencySymbol)}`;

  return (
    <article className="group overflow-hidden rounded-lg border border-[var(--store-border)] bg-white shadow-[0_8px_24px_rgba(75,54,37,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(75,54,37,0.14)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--store-cream)]">
        <Link href={href} className="block h-full">
          {optimizedUrl ? (
            <Image
              src={optimizedUrl}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="store-image-zoom object-cover"
              priority={priority}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-sm text-[var(--store-muted)]">
              لا توجد صورة
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          <span className="rounded bg-[var(--store-gold)] px-2 py-1 text-[11px] font-medium text-white shadow-sm">
            جديد
          </span>
          <FavoriteButton
            item={{
              id: product.id,
              name: displayName,
              href,
              imageUrl: optimizedUrl,
              priceLabel,
            }}
          />
        </div>

        {!inStock && (
          <span className="absolute inset-x-3 bottom-3 rounded bg-black/70 px-3 py-1.5 text-center text-xs text-white">
            غير متوفر
          </span>
        )}
      </div>

      <Link href={href} className="block">
        <div className="space-y-2 px-3 py-4 text-center">
          <h3 className="line-clamp-1 text-sm font-medium text-[var(--store-text)] transition group-hover:text-[var(--store-gold)] md:text-base">
            {displayName}
          </h3>
          <p dir="ltr" className="text-sm font-bold text-[var(--store-text)]">
            {priceLabel}
          </p>
        </div>
      </Link>
    </article>
  );
}
