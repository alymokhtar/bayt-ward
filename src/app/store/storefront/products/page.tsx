import type { Metadata } from "next";
import ProductGrid from "@/components/store/ProductGrid";
import { StorePageHero } from "@/components/store/StoreSections";
import PaginationNav from "@/components/ui/PaginationNav";
import {
  getCachedPublishedProducts,
  getCachedStoreSettingsPublic,
} from "@/lib/store/cached-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "المنتجات",
  description: "تصفحي كل منتجات بيت ورد المنشورة — حجاب وملابس نسائية.",
};

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function StoreProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const settings = await getCachedStoreSettingsPublic();

  const result = await getCachedPublishedProducts(
    JSON.stringify({ page, pageSize: 24 })
  );

  return (
    <>
      <StorePageHero
        title="المنتجات"
        description="تشكيلة مختارة من الحجاب والملابس النسائية — منشورة ومحدّثة من متجرنا."
      />
      <section className="store-container pb-20">
        <ProductGrid
          products={result.items}
          currencySymbol={settings.currency_symbol || "ج.م"}
        />
        {result.totalPages > 1 && (
          <div className="mt-12">
            <PaginationNav
              page={result.page}
              totalPages={result.totalPages}
              basePath="/store/products"
            />
          </div>
        )}
      </section>
    </>
  );
}
