import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowLeft, ArrowRight, BadgePercent, CalendarDays, Clock3, Gift, MapPin, Sparkles } from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import SectionHeading from "@/components/store/SectionHeading";
import { prisma } from "@/lib/prisma";
import { PUBLISHED_PRODUCT_WHERE } from "@/lib/store/constants";
import { storeProductListSelect } from "@/lib/store/types";
import { getCachedStoreSettingsPublic } from "@/lib/store/cached-queries";
import { getShareUrl } from "@/lib/maps-utils";
import { STORE_NAME_AR } from "@/lib/constants";
import { isPromotionDateRangeActive } from "@/lib/promotions";
import { formatPromotionValidity } from "@/lib/promotion-date";
import type { StoreProductListItem } from "@/lib/store/types";

type PromotionPageProps = {
  params: Promise<{ id: string }>;
};

type CachedPromotion = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  buyQuantity: number | null;
  getQuantity: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isStoreOnly: boolean;
  categories: { id: string; name: string; nameAr: string | null }[];
  products: { id: string }[];
};

export const revalidate = 60;

const getCachedPromotion = unstable_cache(
  async (id: string): Promise<CachedPromotion | null> => {
    const promotion = await prisma.promotion.findUnique({
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
        isStoreOnly: true,
        categories: { select: { id: true, name: true, nameAr: true } },
        products: { select: { id: true } },
      },
    });

    if (!promotion) return null;
    return JSON.parse(JSON.stringify(promotion)) as CachedPromotion;
  },
  ["store-promotion-detail"],
  { revalidate: 60, tags: ["store-promotions"] },
);

function isPromotionCurrentlyActive(
  promotion: CachedPromotion,
  now: Date,
): boolean {
  return (
    promotion.isActive &&
    isPromotionDateRangeActive(promotion.startDate, promotion.endDate, now)
  );
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
  let promotion: CachedPromotion | null;
  try {
    promotion = await getCachedPromotion(id);
  } catch (error) {
    console.error("Unable to load promotion metadata:", error);
    return { title: `العروض | ${STORE_NAME_AR}` };
  }

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
  let promotion: CachedPromotion | null;
  let currencySymbol = "MRU";
  let storeAddress = "";
  let googleMapsEmbedUrl = "";
  let sanitizedProducts: StoreProductListItem[] = [];

  try {
    const [promotionData, settings, targetedProducts] = await Promise.all([
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

    promotion = promotionData;
    currencySymbol = settings.currency_symbol || "MRU";
    storeAddress = settings.store_address || "";
    googleMapsEmbedUrl = settings.google_maps_embed_url || "";

    if (promotionData) {
      const hasTargets =
        (promotionData.categories?.length ?? 0) > 0 ||
        (promotionData.products?.length ?? 0) > 0;
      const products = hasTargets
        ? targetedProducts
        : await prisma.product.findMany({
            where: PUBLISHED_PRODUCT_WHERE,
            orderBy: { createdAt: "desc" },
            select: storeProductListSelect,
          });

      sanitizedProducts = JSON.parse(JSON.stringify(products)) as StoreProductListItem[];
    }
  } catch (error) {
    console.error("Unable to render promotion detail page:", error);
    return (
      <div dir="rtl" className="store-container store-section min-h-[50vh]">
        <div className="rounded-xl border border-[var(--store-border)] bg-white px-5 py-12 text-center">
          <h1 className="text-lg font-bold text-[var(--store-text)]">تعذر تحميل تفاصيل العرض</h1>
          <p className="mt-2 text-sm text-[var(--store-muted)]">
            حدثت مشكلة مؤقتة. يرجى المحاولة مرة أخرى بعد قليل.
          </p>
          <Link
            href="/promotions"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded bg-[var(--store-gold)] px-5 text-sm font-bold text-white transition hover:bg-[var(--store-gold-deep)]"
          >
            العودة إلى العروض
          </Link>
        </div>
      </div>
    );
  }

  if (!promotion || !isPromotionCurrentlyActive(promotion, now)) notFound();

  const categories = promotion.categories ?? [];
  const productsPage = sanitizedProducts ?? [];
  const storeLocationHref = getShareUrl(googleMapsEmbedUrl) ||
    (storeAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddress)}`
      : "/store/contact");
  const isExternalLocationLink = storeLocationHref.startsWith("http");
  const categoryNames = categories
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
              {promotion.isStoreOnly && (
                <div className="mt-5 max-w-2xl rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-950">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden="true" />
                    <div>
                      <p className="font-bold">
                        هذا العرض متوفر عند الشراء من الفرع فقط - تفضل بزيارتنا للاستفادة منه
                      </p>
                      {storeAddress && (
                        <p className="mt-1 text-sm leading-6">{storeAddress}</p>
                      )}
                      <Link
                        href={storeLocationHref}
                        target={isExternalLocationLink ? "_blank" : undefined}
                        rel={isExternalLocationLink ? "noopener noreferrer" : undefined}
                        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md bg-rose-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-rose-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        موقع وعنوان الفرع
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-start gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--store-border)] bg-white/80 px-3 py-2 text-sm text-[var(--store-text)]">
                <CalendarDays className="h-4 w-4 text-[var(--store-gold-deep)]" aria-hidden="true" />
                {formatPromotionValidity(promotion.startDate, promotion.endDate)}
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