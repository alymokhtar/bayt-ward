"use client";

import Image from "next/image";
import Link from "next/link";
import { Gift } from "lucide-react";
import FavoriteButton from "@/components/store/FavoriteButton";
import { useStorefrontState } from "@/components/store/StorefrontStateProvider";
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
import type { Promotion } from "@/lib/promotions";
import { formatCurrency } from "@/lib/utils";

type ProductCardProps = {
  product: StoreProductListItem;
  currencySymbol?: string;
  /** Set true only when rendering inside the admin dashboard */
  isDashboard?: boolean;
  showNewBadge?: boolean;
};

export default function ProductCard({
  product,
  currencySymbol = "MRU",
  isDashboard = false,
  showNewBadge = false,
}: ProductCardProps) {
  const { activePromotions } = useStorefrontState();
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
  const productPromotions = activePromotions.filter((promotion) =>
    promotionAppliesToProduct(promotion, product),
  );
  const discountedPrices = getDiscountedPriceRange(
    product.variants.map((variant) => variant.sellingPrice),
    productPromotions,
  );
  const hasPriceDiscount = discountedPrices !== null;
  const priceLabel = formatPriceRange(
    hasPriceDiscount ? discountedPrices : { min, max },
    currencySymbol,
  );

  return (
    <article className="group overflow-hidden rounded-lg border border-[var(--store-border)] bg-white shadow-[0_8px_24px_rgba(75,54,37,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(75,54,37,0.14)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--store-cream)]">
        <Link href={href} prefetch={true} className="block h-full">
          {optimizedUrl ? (
            <Image
              src={optimizedUrl}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              className="store-image-zoom object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-sm text-[var(--store-muted)]">
              لا توجد صورة
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          {showNewBadge && (
            <span className="rounded bg-[var(--store-gold)] px-2 py-1 text-[11px] font-medium text-white shadow-sm">
              جديد
            </span>
          )}
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

      <Link href={href} prefetch={true} className="block">
        <div className="space-y-2 px-3 py-4 text-center">
          <h3 className="line-clamp-1 text-sm font-medium text-[var(--store-text)] transition group-hover:text-[var(--store-gold)] md:text-base">
            {displayName}
          </h3>
          {hasPriceDiscount ? (
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1" dir="ltr">
              <span className="text-sm text-gray-400 line-through">
                {formatPriceRange({ min, max }, currencySymbol)}
              </span>
              <span className="text-lg font-bold text-emerald-600">
                {priceLabel}
              </span>
            </div>
          ) : (
            <p dir="ltr" className="text-sm font-bold text-[var(--store-text)]">
              {priceLabel}
            </p>
          )}
          {productPromotions.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {productPromotions.map((promotion) => {
                if (promotion.type === "BUY_X_GET_Y") {
                  return (
                    <span
                      key={promotion.id}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold leading-4 text-amber-800"
                    >
                      <Gift className="h-3 w-3 shrink-0" aria-hidden="true" />
                      عرض خاص: اشتري {promotion.buyQuantity ?? "—"} واحصلي على {promotion.getQuantity ?? "—"} مجاناً
                    </span>
                  );
                }

                return (
                  <span
                    key={promotion.id}
                    className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold leading-4 text-emerald-700"
                  >
                    {promotion.type === "PERCENTAGE"
                      ? `خصم ${promotion.discountPercent ?? 0}%`
                      : `خصم ${formatCurrency(promotion.discountAmount ?? 0, currencySymbol)}`}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

function promotionAppliesToProduct(
  promotion: Promotion,
  product: StoreProductListItem,
): boolean {
  if (!promotion.isActive) return false;

  const now = Date.now();
  if (promotion.startDate) {
    const startTime = new Date(promotion.startDate).getTime();
    if (!Number.isFinite(startTime) || startTime > now) return false;
  }
  if (promotion.endDate) {
    const endTime = new Date(promotion.endDate).getTime();
    if (!Number.isFinite(endTime) || endTime < now) return false;
  }

  const productTargets = promotion.products ?? [];
  const categoryTargets = promotion.categories ?? [];
  if (productTargets.length === 0 && categoryTargets.length === 0) return true;

  return (
    productTargets.some((target) =>
      (typeof target === "string" ? target : target.id) === product.id,
    ) ||
    categoryTargets.some((target) =>
      (typeof target === "string" ? target : target.id) === product.category.id,
    )
  );
}

function getDiscountedPriceRange(
  prices: number[],
  promotions: Promotion[],
): { min: number; max: number } | null {
  const validPrices = prices.filter((price) => Number.isFinite(price) && price >= 0);
  if (validPrices.length === 0) return null;

  const directPromotions = promotions.filter(
    (promotion) =>
      (promotion.type === "PERCENTAGE" &&
        Number.isFinite(promotion.discountPercent) &&
        (promotion.discountPercent ?? 0) > 0) ||
      (promotion.type === "FIXED_AMOUNT" &&
        Number.isFinite(promotion.discountAmount) &&
        (promotion.discountAmount ?? 0) > 0),
  );
  if (directPromotions.length === 0) return null;

  const discounted = validPrices.map((price) => {
    let nextPrice = price;
    for (const promotion of directPromotions) {
      if (promotion.type === "PERCENTAGE") {
        nextPrice *= 1 - Math.min(100, promotion.discountPercent ?? 0) / 100;
      } else {
        nextPrice -= promotion.discountAmount ?? 0;
      }
    }
    return Math.max(0, Math.round((nextPrice + Number.EPSILON) * 100) / 100);
  });

  return {
    min: Math.min(...discounted),
    max: Math.max(...discounted),
  };
}

function formatPriceRange(
  range: { min: number; max: number },
  currencySymbol: string,
): string {
  return range.min === range.max
    ? formatCurrency(range.min, currencySymbol)
    : `${formatCurrency(range.min, currencySymbol)} - ${formatCurrency(range.max, currencySymbol)}`;
}
