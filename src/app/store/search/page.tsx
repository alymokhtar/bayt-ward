import type { Metadata } from "next";
import Link from "next/link";
import { StorePageHero } from "@/components/store/StoreSections";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "بحث",
  description: "ابحثي في منتجات بيت ورد",
};

export default function SearchPage() {
  return (
    <>
      <StorePageHero
        title="بحث"
        description="البحث الفوري سيُضاف في مرحلة لاحقة"
      />
      <section className="store-container pb-20 text-center">
        <div className="rounded-[2rem] border border-[var(--store-border)] bg-[var(--store-surface)]/90 px-6 py-12 shadow-sm">
          <p className="text-sm text-[var(--store-muted)]">
            في هذه المرحلة، يمكنكِ تصفح{" "}
            <Link href="/store/products" className="text-[var(--store-gold)] underline">
              كل المنتجات
            </Link>{" "}
            أو{" "}
            <Link href="/store/categories" className="text-[var(--store-gold)] underline">
              الأقسام
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
