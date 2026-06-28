"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { updateSettings } from "@/lib/actions/settings";
import { Save } from "lucide-react";
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
  { key: "whatsapp_promotion_default", label: "نص العرض الافتراضي (واتساب)" },
];

export default function SettingsClient({ settings }: SettingsClientProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({
    whatsapp_promotion_default: "عرض خاص لعملائنا الكرام! خصم على التشكيلات الجديدة ✨",
    store_whatsapp: "",
    daily_discount_percent: "0",
    daily_discount_active: "0",
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

      <Button type="submit" loading={loading}>
        <Save className="h-4 w-4" />
        حفظ الإعدادات
      </Button>
    </form>
  );
}
