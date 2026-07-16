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
        <p className="text-sm text-[var(--store-muted)]">
          في هذه المرحلة، يمكنكِ تصفح{" "}
          <Link href="/products" className="text-[var(--store-gold)] underline">
            كل المنتجات
          </Link>{" "}
          أو{" "}
          <Link href="/categories" className="text-[var(--store-gold)] underline">
            الأقسام
          </Link>
          .
        </p>
      </section>
    </>
  );
}
