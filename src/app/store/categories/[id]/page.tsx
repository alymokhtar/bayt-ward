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

  return {
    title: getCategoryDisplayName(category),
    description: category.description || undefined,
  };
}

export default async function StoreCategoryDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const search = await searchParams;
  const page = Number(search.page ?? "1") || 1;

  const [category, result, settings] = await Promise.all([
    getCachedStoreCategory(id),
    getCachedPublishedProducts(JSON.stringify({ categoryId: id, page, pageSize: 24 })),
    getCachedStoreSettingsPublic(),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <>
      <StorePageHero
        title={getCategoryDisplayName(category)}
        description={category.description || "تشكيلات مختارة من هذا القسم"}
      />
      <section className="store-container pb-20">
        <div className="mb-8 rounded-[1.5rem] border border-[var(--store-border)] bg-[var(--store-surface)]/80 px-4 py-4 text-sm text-[var(--store-muted)] shadow-sm md:px-6">
          {category.description || "تشكيلة مختارة ونظيفة تعكس ذوق بيت ورد."}
        </div>
        <ProductGrid
          products={result.items}
          currencySymbol={settings.currency_symbol || "ج.م"}
        />
        {result.totalPages > 1 && (
          <div className="mt-12">
            <PaginationNav
              page={result.page}
              totalPages={result.totalPages}
              basePath={`/store/categories/${id}`}
            />
          </div>
        )}
      </section>
    </>
  );
}
