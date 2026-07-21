import type { Metadata } from "next";
import Link from "next/link";
import ProductGrid from "@/components/store/ProductGrid";
import { StorePageHero } from "@/components/store/StoreSections";
import PaginationNav from "@/components/ui/PaginationNav";
import {
  getCachedSearchProducts,
  getCachedStoreSettingsPublic,
} from "@/lib/store/cached-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "بحث",
  description: "ابحثي في منتجات بيت ورد",
};

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const page = Number(params.page ?? "1") || 1;
  const settings = await getCachedStoreSettingsPublic();
  const result = await getCachedSearchProducts(
    JSON.stringify({ query, page, pageSize: 24 })
  );

  return (
    <>
      <StorePageHero
        title="بحث"
        description={
          query
            ? `نتائج البحث عن "${query}"`
            : "اكتبي ما تبحثين عنه من منتجات بيت ورد"
        }
      />
      <section className="store-container pb-20">
        {!query ? (
          <div className="rounded-[2rem] border border-[var(--store-border)] bg-white/80 px-6 py-12 text-center shadow-sm">
            <p className="store-serif text-2xl text-[var(--store-text)]">
              ابدئي البحث من أيقونة العدسة في الأعلى
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--store-muted)]">
              يمكنك أيضاً تصفح كل المنتجات أو الأقسام لاكتشاف التشكيلات المتاحة.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/store/products"
                className="rounded-full bg-[var(--store-gold)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--store-gold-deep)]"
              >
                كل المنتجات
              </Link>
              <Link
                href="/store/categories"
                className="rounded-full border border-[var(--store-border)] bg-[#FDFBF7] px-6 py-3 text-sm font-semibold text-[var(--store-text)] transition hover:border-[var(--store-gold)]"
              >
                الأقسام
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-2xl border border-[var(--store-border)] bg-white/75 px-5 py-4 text-sm text-[var(--store-muted)] shadow-sm">
              {result.total > 0
                ? `تم العثور على ${result.total} منتج.`
                : "لم نجد منتجات مطابقة حالياً. جرّبي كلمة أخرى أو تصفحي الأقسام."}
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
                  basePath="/store/search"
                  searchParams={{ q: query }}
                />
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
