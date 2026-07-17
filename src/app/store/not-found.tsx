import Link from "next/link";
import { StorePageHero } from "@/components/store/StoreSections";

export default function StoreNotFound() {
  return (
    <>
      <StorePageHero
        title="الصفحة غير موجودة"
        description="يبدو أن الرابط الذي تبحثين عنه غير متاح"
      />
      <section className="store-container pb-20 text-center">
        <Link
          href="/store"
          className="inline-flex rounded-full bg-[var(--store-text)] px-8 py-3 text-sm text-white"
        >
          العودة للرئيسية
        </Link>
      </section>
    </>
  );
}
