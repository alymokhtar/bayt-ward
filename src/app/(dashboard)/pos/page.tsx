import POSClient from "@/app/(dashboard)/pos/POSClient";
import { getStoreSettings } from "@/lib/actions/settings";
import { Store } from "lucide-react";

export default async function POSPage() {
  const settings = await getStoreSettings();

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
        currencySymbol={settings.currency_symbol || "ج.م"}
      />
    </div>
  );
}
