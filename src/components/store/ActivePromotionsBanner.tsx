import Link from "next/link";
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  Clock3,
  Gift,
  Sparkles,
} from "lucide-react";
import { getActivePromotionsData } from "@/lib/promotions-data";
import type { Promotion } from "@/lib/promotions";

function promotionOfferText(promotion: Promotion): string {
  if (promotion.type === "BUY_X_GET_Y") {
    const gift = promotion.discountPercent === 100 ? "مجاناً" : `بخصم ${promotion.discountPercent ?? 100}%`;
    return `اشتري ${promotion.buyQuantity ?? "—"} واحصلي على ${promotion.getQuantity ?? "—"} ${gift}`;
  }

  if (promotion.type === "PERCENTAGE") {
    return `خصم ${promotion.discountPercent ?? "—"}% على السلة`;
  }

  return `خصم ${promotion.discountAmount ?? "—"} على السلة`;
}

function promotionHref(promotion: Promotion): string {
  const productId = promotion.products?.[0];
  if (productId) {
    return `/store/product/${typeof productId === "string" ? productId : productId.id}`;
  }

  const categoryId = promotion.categories?.[0];
  if (categoryId) {
    return `/store/categories/${typeof categoryId === "string" ? categoryId : categoryId.id}`;
  }

  return "/store/products";
}

function getCairoDateParts(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    date,
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function formatPromotionDate(value: Date | string): string | null {
  const parts = getCairoDateParts(value);
  if (!parts) return null;

  const formatted = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parts.date);

  return `يوم ${formatted}`;
}

function formatPromotionDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
): string {
  const startParts = getCairoDateParts(startDate);
  const endParts = getCairoDateParts(endDate);
  const formattedStart = startDate ? formatPromotionDate(startDate) : null;
  const formattedEnd = endDate ? formatPromotionDate(endDate) : null;

  if (formattedStart && formattedEnd && startParts && endParts) {
    const startKey = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
    const endKey = Date.UTC(endParts.year, endParts.month - 1, endParts.day);
    const dayDifference = Math.round((endKey - startKey) / 86_400_000);

    if (dayDifference === 0) return `ساري ${formattedStart}`;
    if (dayDifference === 1) return `ساري من ${formattedStart} إلى ${formattedEnd}`;
    return `ساري من ${formattedStart} حتى ${formattedEnd}`;
  }

  if (formattedStart) return `ساري من ${formattedStart}`;
  if (formattedEnd) return `ساري حتى ${formattedEnd}`;
  return "ساري حالياً";
}

function PromotionCard({ promotion }: { promotion: Promotion }) {
  return (
    <article className="relative isolate flex min-h-48 flex-col overflow-hidden rounded-2xl border border-[var(--store-border)] bg-white p-5 shadow-[0_12px_32px_rgba(75,54,37,0.08)] sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 end-0 -z-10 w-1.5 bg-[var(--store-gold)]"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--store-gold-soft)] text-[var(--store-gold-deep)]">
          {promotion.type === "BUY_X_GET_Y" ? (
            <Gift className="h-5 w-5" aria-hidden="true" />
          ) : (
            <BadgePercent className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--store-border)] bg-[#FDFBF7] px-3 py-1 text-xs font-bold text-[var(--store-gold-deep)]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          عرض خاص
        </span>
      </div>

      <h2 className="mt-4 text-lg font-bold leading-7 text-[var(--store-text)]">
        {promotion.title?.trim() || promotion.name}
      </h2>
      {promotion.description && (
        <p className="mt-1 text-sm leading-6 text-[var(--store-muted)]">
          {promotion.description}
        </p>
      )}
      <p className="mt-3 text-sm font-bold leading-6 text-[var(--store-gold-deep)]">
        {promotionOfferText(promotion)}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--store-border)] pt-3">
        <p className="inline-flex items-center gap-2 text-xs leading-5 text-[var(--store-muted)]">
          <CalendarDays className="h-4 w-4 shrink-0 text-[var(--store-gold-deep)]" aria-hidden="true" />
          <span>{formatPromotionDateRange(promotion.startDate, promotion.endDate)}</span>
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF5E6] px-2.5 py-1 text-[11px] font-semibold text-[var(--store-gold-deep)]">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          أو حتى نفاذ الكمية
        </span>
      </div>

      <Link
        href={promotionHref(promotion)}
        className="mt-auto inline-flex min-h-10 items-center gap-2 self-start pt-4 text-sm font-bold text-[var(--store-text)] transition-colors hover:text-[var(--store-gold-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-gold)]"
      >
        تسوقي العرض
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

export default async function ActivePromotionsBanner() {
  const promotions = await getActivePromotionsData();
  if (promotions.length === 0) return null;

  return (
    <section
      aria-labelledby="active-promotions-heading"
      dir="rtl"
      className="store-container store-section"
    >
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[var(--store-gold-deep)]">لفترة محدودة</p>
          <h2
            id="active-promotions-heading"
            className="mt-1 text-2xl font-bold text-[var(--store-text)]"
          >
            عروض بيت ورد
          </h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promotions.map((promotion) => (
          <PromotionCard key={promotion.id} promotion={promotion} />
        ))}
      </div>
    </section>
  );
}