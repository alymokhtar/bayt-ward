import Link from "next/link";
import { ArrowLeft, BadgePercent, Gift, Sparkles } from "lucide-react";
import { getActivePromotionsData } from "@/lib/promotions-data";
import type { Promotion } from "@/lib/promotions";

export const revalidate = 60;

function offerDescription(promotion: Promotion): string {
  if (promotion.type === "BUY_X_GET_Y") {
    const benefit = promotion.discountPercent === 100
      ? "مجاناً"
      : `بخصم ${promotion.discountPercent ?? 100}%`;
    return `اشتري ${promotion.buyQuantity ?? "—"} واحصلي على ${promotion.getQuantity ?? "—"} ${benefit}`;
  }
  if (promotion.type === "PERCENTAGE") {
    return `خصم ${promotion.discountPercent ?? "—"}% على السلة`;
  }
  return `خصم ${promotion.discountAmount ?? "—"} على السلة`;
}

function PromotionIndexCard({ promotion }: { promotion: Promotion }) {
  return (
    <article className="flex min-h-52 flex-col rounded-xl border border-[var(--store-border)] bg-white p-5 shadow-[0_10px_28px_rgba(75,54,37,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--store-gold-soft)] text-[var(--store-gold-deep)]">
          {promotion.type === "BUY_X_GET_Y" ? (
            <Gift className="h-5 w-5" aria-hidden="true" />
          ) : (
            <BadgePercent className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF5E6] px-3 py-1 text-xs font-bold text-[var(--store-gold-deep)]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          عرض نشط
        </span>
      </div>
      <h2 className="mt-4 text-lg font-bold text-[var(--store-text)]">{promotion.title?.trim() || promotion.name}</h2>
      {promotion.description && (
        <p className="mt-1 text-sm leading-6 text-[var(--store-muted)]">{promotion.description}</p>
      )}
      <p className="mt-3 font-semibold text-[var(--store-gold-deep)]">{offerDescription(promotion)}</p>
      <Link
        href={`/promotions/${promotion.id}`}
        prefetch={true}
        className="mt-auto inline-flex min-h-10 items-center gap-2 self-start pt-5 text-sm font-bold text-[var(--store-text)] transition hover:text-[var(--store-gold-deep)]"
      >
        تصفحي العرض
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

export default async function StorePromotionsPage() {
  const promotions = await getActivePromotionsData();

  return (
    <div dir="rtl" className="store-container store-section min-h-[50vh]">
      <header className="mb-7">
        <p className="text-sm font-bold text-[var(--store-gold-deep)]">لفترة محدودة</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--store-text)]">عروض بيت ورد</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--store-muted)]">
          اكتشفي العروض السارية واختاري المنتجات المشمولة بها.
        </p>
      </header>

      {promotions.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promotion) => (
            <PromotionIndexCard key={promotion.id} promotion={promotion} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--store-border)] bg-white px-5 py-12 text-center">
          <h2 className="text-lg font-bold text-[var(--store-text)]">لا توجد عروض نشطة حالياً</h2>
          <p className="mt-2 text-sm text-[var(--store-muted)]">تابعينا لاكتشاف عروض بيت ورد القادمة.</p>
          <Link
            href="/store/products"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded bg-[var(--store-gold)] px-5 text-sm font-bold text-white transition hover:bg-[var(--store-gold-deep)]"
          >
            تسوقي المنتجات
          </Link>
        </div>
      )}
    </div>
  );
}