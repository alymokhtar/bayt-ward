import type { Metadata } from "next";
import CategoryCard from "@/components/store/StoreSections";
import { StorePageHero } from "@/components/store/StoreSections";
import {
  getCachedPublishedProducts,
  getCachedStoreCategories,
} from "@/lib/store/cached-queries";
import { getPrimaryImageUrl } from "@/lib/store/product-utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "الأقسام",
  description: "تصفحي أقسام بيت ورد — حجاب، ملابس، وإكسسوارات.",
};

export default async function StoreCategoriesPage() {
  const categories = await getCachedStoreCategories();

  const categoriesWithCovers = await Promise.all(
    categories.map(async (category) => {
      const result = await getCachedPublishedProducts(
        JSON.stringify({ categoryId: category.id, page: 1, pageSize: 1 })
      );
      const cover = result.items[0] ? getPrimaryImageUrl(result.items[0]) : null;
      return { category, cover };
    })
  );

  return (
    <>
      <StorePageHero
        title="الأقسام"
        description="اختاري القسم المناسب واكتشفي تشكيلاتنا"
      />
      <section className="store-container pb-20">
        {categoriesWithCovers.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[var(--store-border)] bg-[var(--store-surface)] px-6 py-16 text-center shadow-sm">
            <p className="store-serif text-2xl">لا توجد أقسام متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categoriesWithCovers.map(({ category, cover }) => (
              <CategoryCard key={category.id} category={category} coverImage={cover} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
