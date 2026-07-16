import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/store/ProductCard";
import SectionHeading from "@/components/store/SectionHeading";
import CategoryCard from "@/components/store/StoreSections";
import { WhatsAppCta } from "@/components/store/StoreSections";
import { STORE_NAME, STORE_NAME_AR } from "@/lib/constants";
import {
  getCachedFeaturedProducts,
  getCachedGalleryImages,
  getCachedNewestProducts,
  getCachedPublishedProducts,
  getCachedStoreCategories,
  getCachedStoreSettingsPublic,
} from "@/lib/store/cached-queries";
import { getPrimaryImageUrl } from "@/lib/store/product-utils";
import { optimizeCloudinaryUrl } from "@/lib/store/images";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedStoreSettingsPublic();
  const title = settings.store_name_ar || STORE_NAME_AR;

  return {
    title: `${title} | حجاب وملابس نسائية`,
    description:
      "اكتشفي تشكيلات بيت ورد الأنيقة من الحجاب والملابس النسائية — جودة، أناقة، وطلب سهل عبر واتساب.",
  };
}

const REVIEWS = [
  {
    name: "سارة م.",
    text: "جودة القماش رائعة والتفاصيل فخمة. تجربة شراء مريحة جداً.",
  },
  {
    name: "نورا أ.",
    text: "التشكيلات أنيقة ومناسبة للمحجبات. أنصح به بشدة.",
  },
  {
    name: "مريم ح.",
    text: "الألوان مطابقة للصور والمقاسات دقيقة. خدمة واتساب سريعة.",
  },
];

export default async function StoreHomePage() {
  const settings = await getCachedStoreSettingsPublic();
  const storeName = settings.store_name_ar || STORE_NAME_AR;
  const currencySymbol = settings.currency_symbol || "ج.م";

  const [featured, newest, categories, gallery, productsPage] = await Promise.all([
    getCachedFeaturedProducts(8),
    getCachedNewestProducts(8),
    getCachedStoreCategories(),
    getCachedGalleryImages(8),
    getCachedPublishedProducts(JSON.stringify({ page: 1, pageSize: 1 })),
  ]);

  const featuredProducts = featured.length > 0 ? featured : newest.slice(0, 8);
  const hasProducts = productsPage.total > 0;

  const categoriesWithCovers = await Promise.all(
    categories.slice(0, 4).map(async (category) => {
      const result = await getCachedPublishedProducts(
        JSON.stringify({ categoryId: category.id, page: 1, pageSize: 1 })
      );
      const cover = result.items[0] ? getPrimaryImageUrl(result.items[0]) : null;
      return { category, cover };
    })
  );

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="store-container grid min-h-[72vh] items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="store-animate-in space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--store-gold)]">
              {settings.store_name || STORE_NAME}
            </p>
            <h1 className="store-serif text-5xl font-semibold leading-tight text-[var(--store-text)] md:text-6xl">
              أناقة هادئة
              <br />
              <span className="text-[var(--store-gold)]">للمرأة العصرية</span>
            </h1>
            <p className="max-w-lg text-base leading-8 text-[var(--store-muted)]">
              {storeName} — تشكيلات مختارة من الحجاب والملابس النسائية بلمسة
              فاخرة، بسيطة، وعصرية.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-[var(--store-text)] px-8 py-3.5 text-sm font-medium text-white transition hover:bg-black"
              >
                تسوقي الآن
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center justify-center rounded-full border border-[var(--store-border)] bg-white px-8 py-3.5 text-sm font-medium transition hover:border-[var(--store-gold)]"
              >
                استكشفي الأقسام
              </Link>
            </div>
          </div>

          <div className="store-animate-in store-animate-delay-1 relative aspect-[4/5] overflow-hidden rounded-sm bg-white shadow-xl shadow-black/5">
            {gallery[0] ? (
              <Image
                src={optimizeCloudinaryUrl(gallery[0].url, {
                  width: 900,
                  height: 1125,
                  crop: "fill",
                })}
                alt={storeName}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[var(--store-border)] text-[var(--store-muted)]">
                {storeName}
              </div>
            )}
          </div>
        </div>
      </section>

      {hasProducts && featuredProducts.length > 0 && (
        <section className="store-container py-16 md:py-20">
          <SectionHeading
            eyebrow="Featured"
            title="منتجات مميزة"
            description="تشكيلاتنا الأكثر طلباً — مختارة بعناية لتناسب ذوقكِ"
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {featuredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                currencySymbol={currencySymbol}
                priority={index < 4}
              />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/products"
              className="store-link-hover text-sm uppercase tracking-[0.25em] text-[var(--store-text)]"
            >
              عرض كل المنتجات
            </Link>
          </div>
        </section>
      )}

      {newest.length > 0 && (
        <section className="bg-white py-16 md:py-20">
          <div className="store-container">
            <SectionHeading
              eyebrow="New In"
              title="أحدث الإضافات"
              description="اكتشفي آخر ما وصل إلى مجموعتنا"
            />
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
              {newest.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {categoriesWithCovers.length > 0 && (
        <section className="store-container py-16 md:py-20">
          <SectionHeading
            eyebrow="Collections"
            title="تسوقي حسب القسم"
            description="تشكيلات متنوعة لتلبية كل المناسبات"
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categoriesWithCovers.map(({ category, cover }) => (
              <CategoryCard key={category.id} category={category} coverImage={cover} />
            ))}
          </div>
        </section>
      )}

      <section className="bg-[var(--store-text)] py-16 text-white md:py-20">
        <div className="store-container">
          <SectionHeading
            eyebrow="Why Bayt Ward"
            title="لماذا بيت ورد؟"
            description="لأننا نؤمن أن الأناقة تبدأ من التفاصيل"
            align="center"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "جودة فاخرة",
                text: "أقمشة مختارة وتفاصيل دقيقة في كل قطعة.",
              },
              {
                title: "تصاميم عصرية",
                text: "تشكيلات تناسب المحجبات بأسلوب minimal أنيق.",
              },
              {
                title: "طلب سهل",
                text: "اطلبي مباشرة عبر واتساب بخطوات بسيطة.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
              >
                <h3 className="store-serif text-2xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="store-container py-16 md:py-20">
          <SectionHeading
            eyebrow="Gallery"
            title="من مجموعتنا"
            description="لمحة من أحدث قطعنا"
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square overflow-hidden rounded-sm bg-white"
              >
                <Image
                  src={optimizeCloudinaryUrl(item.url, { width: 500, height: 500, crop: "fill" })}
                  alt={item.altText || storeName}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition duration-500 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white py-16 md:py-20">
        <div className="store-container">
          <SectionHeading
            eyebrow="Reviews"
            title="آراء عملائنا"
            description="ثقة عملائنا هي أكبر شهادة على جودة منتجاتنا"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {REVIEWS.map((review) => (
              <blockquote
                key={review.name}
                className="rounded-2xl border border-[var(--store-border)] bg-[var(--store-bg)] p-6"
              >
                <p className="text-sm leading-7 text-[var(--store-muted)]">
                  &ldquo;{review.text}&rdquo;
                </p>
                <footer className="mt-4 text-sm font-medium text-[var(--store-text)]">
                  — {review.name}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <WhatsAppCta
        whatsappNumber={settings.store_whatsapp || settings.store_phone || ""}
        storeName={storeName}
      />
    </>
  );
}
