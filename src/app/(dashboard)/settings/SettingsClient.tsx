"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { updateSettings } from "@/lib/actions/settings";
import { Save, Globe2, Camera, Music2, PlayCircle, Bird, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SettingsClientProps {
  settings: Record<string, string>;
}

const fields = [
  { key: "store_name", label: "اسم المتجر (إنجليزي)" },
  { key: "store_name_ar", label: "اسم المتجر (عربي)" },
  { key: "store_phone", label: "هاتف المتجر", dir: "ltr" as const },
  { key: "store_whatsapp", label: "رقم واتساب المتجر", dir: "ltr" as const },
  { key: "store_address", label: "عنوان المتجر" },
  { key: "store_email", label: "بريد المتجر", dir: "ltr" as const },
  { key: "tax_rate", label: "نسبة الضريبة (%)", type: "number" },
  { key: "currency", label: "العملة", dir: "ltr" as const },
  { key: "currency_symbol", label: "رمز العملة" },
  { key: "google_maps_embed_url", label: "رابط خرائط جوجل (Embed URL أو رابط المشاركة)", dir: "ltr" as const },
  { key: "whatsapp_promotion_default", label: "نص العرض الافتراضي (واتساب)" },
];

export default function SettingsClient({ settings }: SettingsClientProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({
    whatsapp_promotion_default: "عرض خاص لعملائنا الكرام! خصم على التشكيلات الجديدة ✨",
    store_whatsapp: "",
    daily_discount_percent: "0",
    daily_discount_active: "0",
    social_facebook_url: "",
    social_instagram_url: "",
    social_tiktok_url: "",
    social_youtube_url: "",
    social_snapchat_url: "",
    social_x_url: "",
    google_maps_embed_url: "",
    ...settings,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await updateSettings(values);
    setLoading(false);

    if (result.success) {
      setSuccess("تم حفظ الإعدادات بنجاح");
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  const discountActive = values.daily_discount_active === "1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            type={field.type || "text"}
            value={values[field.key] || ""}
            onChange={(e) => updateField(field.key, e.target.value)}
            dir={field.dir}
            className={field.dir ? "text-start" : undefined}
          />
        ))}
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <h3 className="font-semibold text-brown">خصم اليوم</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="نسبة خصم اليوم (%)"
            type="number"
            min={0}
            max={100}
            value={values.daily_discount_percent || "0"}
            onChange={(e) => updateField("daily_discount_percent", e.target.value)}
          />
          <div className="flex items-center gap-3 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={discountActive}
                onChange={(e) => updateField("daily_discount_active", e.target.checked ? "1" : "0")}
                className="h-5 w-5 rounded border-border text-gold focus:ring-gold"
              />
              <span className="text-sm font-medium text-brown">تفعيل خصم اليوم</span>
            </label>
          </div>
        </div>
        <p className="text-xs text-muted">
          عند التفعيل سيظهر هذا الخصم تلقائياً في نقطة البيع ويُلغى تلقائياً في نهاية يوم العمل.
        </p>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <h3 className="font-semibold text-brown">وسائل التواصل الاجتماعي</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <Globe2 className="h-5 w-5 text-muted/80" />
            <Input
              label="فيسبوك"
              value={values.social_facebook_url || ""}
              onChange={(e) => updateField("social_facebook_url", e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-muted/80" />
            <Input
              label="انستجرام"
              value={values.social_instagram_url || ""}
              onChange={(e) => updateField("social_instagram_url", e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-3">
            <Music2 className="h-5 w-5 text-muted/80" />
            <Input
              label="تيك توك"
              value={values.social_tiktok_url || ""}
              onChange={(e) => updateField("social_tiktok_url", e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-3">
            <PlayCircle className="h-5 w-5 text-muted/80" />
            <Input
              label="يوتيوب"
              value={values.social_youtube_url || ""}
              onChange={(e) => updateField("social_youtube_url", e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-muted/80" />
            <Input
              label="سناب شات"
              value={values.social_snapchat_url || ""}
              onChange={(e) => updateField("social_snapchat_url", e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-3">
            <Bird className="h-5 w-5 text-muted/80" />
            <Input
              label="إكس (تويتر)"
              value={values.social_x_url || ""}
              onChange={(e) => updateField("social_x_url", e.target.value)}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted/80" />
          <h3 className="font-semibold text-brown">خرائط جوجل</h3>
        </div>
        <div className="grid gap-4">
          <Input
            label="رابط خرائط جوجل"
            value={values.google_maps_embed_url || ""}
            onChange={(e) => updateField("google_maps_embed_url", e.target.value)}
            dir="ltr"
            placeholder="https://maps.app.goo.gl/... أو كود Embed من جوجل ماب"
          />
          <p className="text-xs text-muted">
            يمكنك الحصول على رابط المشاركة من جوجل ماب بالضغط على "المشاركة" أو نسخ كود الـ Embed.
          </p>
        </div>
      </div>

      <Button type="submit" loading={loading}>
        <Save className="h-4 w-4" />
        حفظ الإعدادات
      </Button>
    </form>
  );
}
