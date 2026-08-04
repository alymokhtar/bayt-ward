"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createGlobalColor, deleteGlobalColor, getGlobalColors } from "@/lib/actions/global-colors";
import { Trash2 } from "lucide-react";

type GlobalColor = {
  id: string;
  name: string;
  hexCode: string;
  createdAt: string;
};

export default function GlobalColorManager() {
  const router = useRouter();
  const [colors, setColors] = useState<GlobalColor[]>([]);
  const [name, setName] = useState("");
  const [hexCode, setHexCode] = useState("#000000");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadColors() {
    try {
      const result = await getGlobalColors();
      setColors(result);
    } catch {
      setError("تعذر تحميل الألوان");
    }
  }

  useEffect(() => {
    loadColors();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await createGlobalColor({ name, hexCode });
    setLoading(false);

    if (result.success) {
      setName("");
      setHexCode("#000000");
      setSuccess("تم إضافة اللون بنجاح");
      await loadColors();
      router.refresh();
      return;
    }

    setError(result.error ?? "تعذر إضافة اللون");
  }

  async function handleDelete(colorId: string) {
    setDeleteLoading(colorId);
    setError("");
    setSuccess("");

    const result = await deleteGlobalColor(colorId);
    setDeleteLoading(null);

    if (result.success) {
      setSuccess("تم حذف اللون بنجاح");
      await loadColors();
      router.refresh();
      return;
    }

    setError(result.error ?? "تعذر حذف اللون");
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-brown">مرجع الألوان المركزي</h3>
        <p className="text-sm text-muted mt-1">
          أدر الألوان المستخدمة في اللوحة هنا. لا يمكن حذف اللون إذا كان مرتبطًا بمنتجات.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[2fr_1fr]">
        <Input
          label="اسم اللون"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="مثال: أحمر" 
          required
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-brown">رمز اللون</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={hexCode}
              onChange={(event) => setHexCode(event.target.value)}
              className="h-11 w-20 cursor-pointer rounded-lg border border-border bg-white p-1"
              aria-label="اختر لون Hex"
            />
            <span className="font-medium text-brown">{hexCode}</span>
          </div>
        </div>

        <div className="lg:col-span-2 xl:col-span-2">
          <Button type="submit" loading={loading} className="w-full">
            حفظ اللون
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        <h4 className="text-sm font-semibold text-brown">الألوان المسجلة</h4>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {colors.length === 0 ? (
            <div className="rounded-2xl border border-border bg-cream px-4 py-6 text-center text-sm text-muted">
              لا توجد ألوان مسجلة بعد.
            </div>
          ) : (
            colors.map((color) => (
              <div
                key={color.id}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:border-gold/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-full border border-border"
                      style={{ backgroundColor: color.hexCode }}
                    />
                    <div>
                      <p className="font-semibold text-brown">{color.name}</p>
                      <p className="text-sm text-muted">{color.hexCode}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(color.id)}
                    disabled={deleteLoading !== null}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
