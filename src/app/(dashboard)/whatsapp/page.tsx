import WhatsAppPanel from "@/components/whatsapp/WhatsAppPanel";
import { getCustomers } from "@/lib/actions/customers";
import { getStoreSettings } from "@/lib/actions/settings";
import { MessageCircle } from "lucide-react";

export default async function WhatsAppPage() {
  const [customerResult, settings] = await Promise.all([
    getCustomers({ pageSize: 500 }),
    getStoreSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brown">مركز واتساب</h1>
          <p className="text-sm text-muted mt-1">
            إرسال رسائل للعملاء عبر واتساب — عروض، شكر، وتذكير
          </p>
        </div>
      </div>

      <WhatsAppPanel
        customers={customerResult.items.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
        }))}
        storeNameAr={settings.store_name_ar || "بيت ورد"}
        defaultPromotion={settings.whatsapp_promotion_default || ""}
      />
    </div>
  );
}
