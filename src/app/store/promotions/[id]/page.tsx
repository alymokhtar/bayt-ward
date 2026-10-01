import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowRight, BadgePercent, CalendarDays, Clock3, Gift, Sparkles } from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import SectionHeading from "@/components/store/SectionHeading";
import { prisma } from "@/lib/prisma";
import { PUBLISHED_PRODUCT_WHERE } from "@/lib/store/constants";
import { storeProductListSelect } from "@/lib/store/types";
import { getCachedStoreSettingsPublic } from "@/lib/store/cached-queries";
import { STORE_NAME_AR } from "@/lib/constants";
import { isPromotionDateRangeActive } from "@/lib/promotions";

type PromotionPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 60;

const getCachedPromotion = unstable_cache(
  async (id: string) =>
    prisma.promotion.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        buyQuantity: true,
        getQuantity: true,
        discountPercent: true,
        discountAmount: true,
        startDate: true,
        endDate: true,
        isActive: true,
        categories: { select: { id: true, name: true, nameAr: true } },
        products: { select: { id: true } },
      },
    }),
  ["store-promotion-detail"],
  { revalidate: 60, tags: ["store-promotions"] },
);

function isPromotionCurrentlyActive(
  promotion: NonNullable<Awaited<ReturnType<typeof getCachedPromotion>>>,
  now: Date,
): boolean {
  return (
    promotion.isActive &&
    isPromotionDateRangeActive(promotion.startDate, promotion.endDate, now)
  );
}

function formatPromotionDate(value: Date | null): string | null {
  if (!value || !Number.isFinite(value.getTime())) return null;

  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function getDateKey(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function formatPromotionDateRange(startDate: Date | null, endDate: Date | null): string {
  const start = formatPromotionDate(startDate);
  const end = formatPromotionDate(endDate);

  if (start && end && startDate && endDate) {
    const dayDifference = Math.round((getDateKey(endDate) - getDateKey(startDate)) / 86_400_000);
    if (dayDifference === 0) return `ساري يوم ${start}`;
    if (dayDifference === 1) return `ساري من يوم ${start} إلى يوم ${end}`;
    return `ساري من يوم ${start} حتى يوم ${end}`;
  }

  if (start) return `ساري من يوم ${start}`;
  if (end) return `ساري حتى يوم ${end}`;
  return "ساري حالياً";
}

function getPromotionOffer(promotion: {
  type: string;
  buyQuantity: number | null;
  getQuantity: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
}) {
  if (promotion.type === "BUY_X_GET_Y") {
    const discount = promotion.discountPercent ?? 100;
    const benefit = discount === 100 ? "مجاناً" : `بخصم ${discount}%`;
    return `اشتري ${promotion.buyQuantity ?? "—"} واحصلي على ${promotion.getQuantity ?? "—"} ${benefit}`;
  }

  if (promotion.type === "PERCENTAGE") {
    return `خصم ${promotion.discountPercent ?? "—"}% على السلة`;
  }

  return `خصم ${promotion.discountAmount ?? "—"} على السلة`;
}

export async function generateMetadata({ params }: PromotionPageProps): Promise<Metadata> {
  const { id } = await params;
  const promotion = await getCachedPromotion(id);

  if (!promotion || !isPromotionCurrentlyActive(promotion, new Date())) {
    return { title: "العرض غير متاح" };
  }

  return {
    title: `${promotion.name} | ${STORE_NAME_AR}`,
    description: promotion.description || promotion.name,
  };
}

export default async function PromotionPage({ params }: PromotionPageProps) {
  const { id } = await params;
  const now = new Date();
  const [promotion, settings, targetedProducts] = await Promise.all([
    getCachedPromotion(id),
    getCachedStoreSettingsPublic(),
    prisma.product.findMany({
      where: {
        ...PUBLISHED_PRODUCT_WHERE,
        OR: [
          { promotions: { some: { id } } },
          { category: { promotions: { some: { id } } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: storeProductListSelect,
    }),
  ]);

  if (!promotion || !isPromotionCurrentlyActive(promotion, now)) notFound();

  const hasTargets = promotion.categories.length > 0 || promotion.products.length > 0;
  const productsPage = hasTargets
    ? targetedProducts
    : await prisma.product.findMany({
        where: PUBLISHED_PRODUCT_WHERE,
        orderBy: { createdAt: "desc" },
        select: storeProductListSelect,
      });

  const currencySymbol = settings.currency_symbol || "MRU";
  const categoryNames = promotion.categories
    .map((category) => category.nameAr?.trim() || category.name)
    .join("، ");

  return (
    <div dir="rtl" className="pb-10">
      <section className="relative overflow-hidden border-b border-[var(--store-border)] bg-[var(--store-cream)]">
        <div aria-hidden="true" className="absolute inset-y-0 end-0 w-2 bg-[var(--store-gold)]" />
        <div className="store-container py-10 md:py-14">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--store-muted)] transition hover:text-[var(--store-gold-deep)]"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            العودة للمتجر
          </Link>

          <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--store-border)] bg-white/80 px-3 py-1.5 text-xs font-bold text-[var(--store-gold-deep)]">
                {promotion.type === "BUY_X_GET_Y" ? (
                  <Gift className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <BadgePercent className="h-4 w-4" aria-hidden="true" />
                )}
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                عرض خاص
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--store-text)] md:text-4xl">
                {promotion.name}
              </h1>
              {promotion.description && (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--store-muted)] md:text-base">
                  {promotion.description}
                </p>
              )}
              <p className="mt-4 text-lg font-bold text-[var(--store-gold-deep)]">
                {getPromotionOffer(promotion)}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--store-border)] bg-white/80 px-3 py-2 text-sm text-[var(--store-text)]">
                <CalendarDays className="h-4 w-4 text-[var(--store-gold-deep)]" aria-hidden="true" />
                {formatPromotionDateRange(promotion.startDate, promotion.endDate)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-[var(--store-gold-deep)]">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                أو حتى نفاذ الكمية
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="store-container store-section">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <SectionHeading title="المنتجات المشمولة بالعرض" />
          <p className="text-sm text-[var(--store-muted)]">
            {productsPage.length} {productsPage.length === 1 ? "منتج" : "منتجات"}
          </p>
        </div>

        {categoryNames && (
          <p className="mb-5 text-sm text-[var(--store-muted)]">
            أقسام مشمولة: <span className="font-semibold text-[var(--store-text)]">{categoryNames}</span>
          </p>
        )}

        {productsPage.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {productsPage.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currencySymbol={currencySymbol}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--store-border)] bg-white px-5 py-12 text-center">
            <h2 className="text-lg font-bold text-[var(--store-text)]">لا توجد منتجات متاحة حالياً</h2>
            <p className="mt-2 text-sm text-[var(--store-muted)]">
              المنتجات المشمولة بهذا العرض غير متوفرة في المتجر الآن.
            </p>
            <Link
              href="/store/products"
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded bg-[var(--store-gold)] px-5 text-sm font-bold text-white transition hover:bg-[var(--store-gold-deep)]"
            >
              تصفحي جميع المنتجات
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}