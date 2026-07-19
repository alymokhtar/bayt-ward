import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import SectionHeading from "@/components/store/SectionHeading";
import CategoryCard, { TrustSignals, WhatsAppCta } from "@/components/store/StoreSections";
import { STORE_NAME_AR } from "@/lib/constants";
import {
  getCachedFeaturedProducts,
  getCachedGalleryImages,
  getCachedNewestProducts,
  getCachedPublishedProducts,
  getCachedStoreCategories,
  getCachedStoreSettingsPublic,
} from "@/lib/store/cached-queries";
import { getPrimaryImageUrl } from "@/lib/store/product-utils";

export const revalidate = 60;

const HERO_SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1545291730-faff8ca1d4b0?auto=format&fit=crop&w=1600&q=80",
    alt: "إطلالة محتشمة بألوان بيج دافئة",
  },
  {
    src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=80",
    alt: "عباية أنيقة بإضاءة ناعمة",
  },
  {
    src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=80",
    alt: "حجاب بتدرجات طبيعية وخلفية هادئة",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedStoreSettingsPublic();
  const title = settings.store_name_ar || STORE_NAME_AR;

  return {
    title: `${title} | حجاب وملابس نسائية`,
    description:
      "اكتشفي تشكيلات بيت ورد الأنيقة من الحجاب والعبايات وملابس المنزل بإطلالة هادئة وطلب سهل عبر واتساب.",
  };
}

export default async function StoreHomePage() {
  const settings = await getCachedStoreSettingsPublic();
  const storeName = settings.store_name_ar || STORE_NAME_AR;
  const currencySymbol = settings.currency_symbol || "MRU";

  const [featured, newest, categories, , productsPage] = await Promise.all([
    getCachedFeaturedProducts(8),
    getCachedNewestProducts(8),
    getCachedStoreCategories(),
    getCachedGalleryImages(8),
    getCachedPublishedProducts(JSON.stringify({ page: 1, pageSize: 1 })),
  ]);

  const featuredProducts = featured.length > 0 ? featured : newest.slice(0, 8);
  const arrivalProducts = newest.length > 0 ? newest.slice(0, 5) : featuredProducts.slice(0, 5);
  const hasProducts = productsPage.total > 0;

  const categoriesWithCovers = await Promise.all(
    categories.slice(0, 5).map(async (category) => {
      const result = await getCachedPublishedProducts(
        JSON.stringify({ categoryId: category.id, page: 1, pageSize: 1 })
      );
      const cover = result.items[0] ? getPrimaryImageUrl(result.items[0]) : null;
      return { category, cover };
    })
  );

  return (
    <>
      <section className="relative overflow-hidden bg-[var(--store-cream)]">
        <div className="relative min-h-[24rem] md:min-h-[27rem] lg:min-h-[31rem]">
          <div className="absolute inset-0">
            {HERO_SLIDES.map((slide) => (
              <div key={slide.src} className="store-hero-slide absolute inset-0">
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="h-full w-full object-cover object-left md:object-center"
                />
              </div>
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,253,249,0.08),rgba(255,253,249,0.74)_54%,rgba(255,253,249,0.95))]" />
          </div>

          <div className="store-container relative flex min-h-[24rem] items-center justify-start py-12 text-right md:min-h-[27rem] lg:min-h-[31rem]">
            <div className="store-animate-in max-w-sm md:mr-20">
              <h1 className="text-4xl font-bold leading-tight text-[var(--store-text)] md:text-5xl">
                أناقة تحكي
                <br />
                أسلوبك
              </h1>
              <p className="mt-5 text-base leading-8 text-[var(--store-muted)]">
                اكتشفي أحدث تشكيلاتنا من الطرح والعبايات وملابس المنزل
              </p>
              <Link
                href="/store/products"
                className="mt-7 inline-flex min-h-12 items-center justify-center rounded bg-[var(--store-gold)] px-10 text-base font-bold text-white shadow-sm transition hover:bg-[var(--store-gold-deep)]"
              >
                تسوقي الآن
              </Link>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2" aria-hidden="true">
            {HERO_SLIDES.map((slide) => (
              <span key={`${slide.src}-dot`} className="h-2.5 w-2.5 rounded-full bg-white/85 shadow" />
            ))}
          </div>

          <button
            type="button"
            className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--store-text)] shadow-sm md:inline-flex"
            aria-label="الشريحة السابقة"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--store-text)] shadow-sm md:inline-flex"
            aria-label="الشريحة التالية"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {categoriesWithCovers.length > 0 && (
        <section className="store-container store-section">
          <SectionHeading title="الأقسام" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categoriesWithCovers.map(({ category, cover }) => (
              <CategoryCard key={category.id} category={category} coverImage={cover} />
            ))}
          </div>
        </section>
      )}

      {hasProducts && arrivalProducts.length > 0 && (
        <section className="store-container store-section pt-0">
          <SectionHeading title="وصل حديثاً" />
          <div className="relative">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {arrivalProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currencySymbol={currencySymbol}
                  priority={index < 5}
                />
              ))}
            </div>
            <button
              type="button"
              className="absolute -left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[var(--store-text)] shadow-[0_8px_24px_rgba(75,54,37,0.12)] lg:inline-flex"
              aria-label="منتجات سابقة"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute -right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[var(--store-text)] shadow-[0_8px_24px_rgba(75,54,37,0.12)] lg:inline-flex"
              aria-label="منتجات تالية"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/store/products"
              className="inline-flex min-h-11 min-w-64 items-center justify-center rounded border border-[var(--store-gold)] bg-white px-8 text-sm font-bold text-[var(--store-gold)] transition hover:bg-[var(--store-gold)] hover:text-white"
            >
              عرض جميع المنتجات
            </Link>
          </div>
        </section>
      )}

      <TrustSignals />
      <WhatsAppCta
        whatsappNumber={settings.store_whatsapp || settings.store_phone || ""}
        storeName={storeName}
      />
    </>
  );
}
