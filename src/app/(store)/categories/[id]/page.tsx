import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductGrid from "@/components/store/ProductGrid";
import { StorePageHero } from "@/components/store/StoreSections";
import PaginationNav from "@/components/ui/PaginationNav";
import {
  getCachedPublishedProducts,
  getCachedStoreCategory,
  getCachedStoreSettingsPublic,
} from "@/lib/store/cached-queries";
import { getCategoryDisplayName } from "@/lib/store/product-utils";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const category = await getCachedStoreCategory(id);

  if (!category) {
    return { title: "القسم غير موجود" };
  }

  const name = getCategoryDisplayName(category);
  return {
    title: name,
    description: category.description || `تسوقي ${name} من بيت ورد`,
  };
}

export default async function StoreCategoryDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const page = Number(query.page ?? "1") || 1;

  const [category, settings] = await Promise.all([
    getCachedStoreCategory(id),
    getCachedStoreSettingsPublic(),
  ]);

  if (!category) {
    notFound();
  }

  const result = await getCachedPublishedProducts(
    JSON.stringify({ categoryId: id, page, pageSize: 24 })
  );

  const name = getCategoryDisplayName(category);

  return (
    <>
      <StorePageHero
        title={name}
        description={category.description || `${category._count.products} منتج في هذا القسم`}
        backHref="/categories"
        backLabel="كل الأقسام"
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
              basePath={`/categories/${id}`}
            />
          </div>
        )}
      </section>
    </>
  );
}
