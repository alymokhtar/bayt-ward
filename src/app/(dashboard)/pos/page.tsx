import POSClient from "@/app/(dashboard)/pos/POSClient";
import { getStoreSettings } from "@/lib/actions/settings";
import { getEgyptBusinessDateKey } from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import { Store } from "lucide-react";

export default async function POSPage() {
  const settings = await getStoreSettings();

  const todayKey = getEgyptBusinessDateKey();
  const discountDate = settings.daily_discount_date || "";
  const discountActive = settings.daily_discount_active === "1";
  const discountPercent = parseFloat(settings.daily_discount_percent || "0") || 0;

  let dailyDiscountActive = discountActive && discountDate === todayKey && discountPercent > 0;

  // Auto-clear if the discount is from a previous business day
  if (discountActive && discountDate !== todayKey) {
    await prisma.setting.upsert({
      where: { key: "daily_discount_active" },
      update: { value: "0" },
      create: { key: "daily_discount_active", value: "0" },
    });
    dailyDiscountActive = false;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
          <Store className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brown">نقطة البيع</h1>
          <p className="text-sm text-muted">إتمام عمليات البيع بسرعة</p>
        </div>
      </div>
      <POSClient
        storeNameAr={settings.store_name_ar || "بيت ورد"}
        storePhone={settings.store_phone}
        currencySymbol={settings.currency_symbol || "ج.م"}
        dailyDiscountPercent={dailyDiscountActive ? discountPercent : 0}
      />
    </div>
  );
}
