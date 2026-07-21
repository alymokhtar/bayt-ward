import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/store/ProductDetailClient";
import ProductCard from "@/components/store/ProductCard";
import SectionHeading from "@/components/store/SectionHeading";
import {
  getCachedPublishedProduct,
  getCachedSimilarProducts,
  getCachedStoreSettingsPublic,
} from "@/lib/store/cached-queries";
import { getProductDisplayName, getStoreProductPath } from "@/lib/store/product-utils";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getCachedPublishedProduct(id);

  if (!product) {
    return { title: "المنتج غير موجود" };
  }

  const name = getProductDisplayName(product);

  return {
    title: name,
    description: product.description || `اطلبي ${name} من بيت ورد`,
    openGraph: {
      title: name,
      description: product.description || undefined,
      type: "website",
    },
  };
}

export default async function StoreProductPage({ params }: PageProps) {
  const { id } = await params;

  const [product, settings] = await Promise.all([
    getCachedPublishedProduct(id),
    getCachedStoreSettingsPublic(),
  ]);

  if (!product) {
    notFound();
  }

  const similar = await getCachedSimilarProducts(id, product.categoryId, 4);
  const displayName = getProductDisplayName(product);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const productUrl = siteUrl
    ? `${siteUrl}${getStoreProductPath(id)}`
    : getStoreProductPath(id);
  const whatsappNumber = settings.store_whatsapp || settings.store_phone || "";

  const prices = product.variants.map((variant) => variant.sellingPrice);
  const hasPrices = prices.length > 0;

  return (
    <>
      <section className="store-container pb-10 pt-6 md:pb-14 md:pt-8 lg:pt-10">
        <ProductDetailClient
          product={product}
          productUrl={productUrl}
          whatsappNumber={whatsappNumber}
          currencySymbol={settings.currency_symbol || "ج.م"}
        />
      </section>

      {similar.length > 0 && (
        <section className="bg-white py-16 md:py-20">
          <div className="store-container">
            <SectionHeading
              eyebrow="You may also like"
              title="منتجات مشابهة"
              align="start"
            />
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
              {similar.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  currencySymbol={settings.currency_symbol || "ج.م"}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: displayName,
            description: product.description,
            brand: product.brand
              ? { "@type": "Brand", name: product.brand }
              : undefined,
            category: product.category.nameAr || product.category.name,
            offers: hasPrices
              ? {
                  "@type": "AggregateOffer",
                  priceCurrency: "EGP",
                  lowPrice: Math.min(...prices),
                  highPrice: Math.max(...prices),
                  availability: product.variants.some((v) => v.stockQuantity > 0)
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                }
              : undefined,
          }),
        }}
      />
    </>
  );
}
