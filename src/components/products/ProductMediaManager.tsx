"use client";

import Button from "@/components/ui/Button";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, deleteProductMedia, getProductColorsWithMedia, setPrimaryProductMedia, toggleProductMediaActive, updateProductMediaAltText, uploadProductMedia } from "@/lib/actions/product-media";
import type { ProductColorWithMedia, ProductMediaItem } from "@/lib/types/product-media";
import { Check, Eye, EyeOff, ImagePlus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ProductMediaManagerProps = {
  productId: string;
  productColorId?: string;
};

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProductMediaManager({ productId, productColorId }: ProductMediaManagerProps) {
  const [colors, setColors] = useState<ProductColorWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<ProductMediaItem | null>(null);

  async function refreshColors() {
    setLoading(true);
    const data = await getProductColorsWithMedia(productId);
    setColors(data);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadColors() {
      setLoading(true);
      const data = await getProductColorsWithMedia(productId);
      if (!cancelled) {
        setColors(data);
        setLoading(false);
      }
    }

    void loadColors();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const selectedColor = useMemo(() => {
    if (!productColorId) {
      return colors[0] ?? null;
    }

    return colors.find((color) => color.id === productColorId) ?? colors[0] ?? null;
  }, [colors, productColorId]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || !selectedColor) return;

    setError(null);
    setUploading(true);
    const uploads = Array.from(files);

    try {
      for (const [index, file] of uploads.entries()) {
        const formData = new FormData();
        formData.append("productColorId", selectedColor.id);
        formData.append("file", file);
        const result = await uploadProductMedia(formData);
        if (!result.success) {
          throw new Error(result.error);
        }
        await refreshColors();
        if (index === uploads.length - 1) {
          setUploading(false);
        }
      }
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : "فشل رفع الصورة");
    }
  }

  async function handleDelete(mediaId: string) {
    const result = await deleteProductMedia(mediaId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    await refreshColors();
  }

  async function handlePrimary(mediaId: string) {
    const result = await setPrimaryProductMedia(mediaId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    await refreshColors();
  }

  async function handleToggle(mediaId: string, isActive: boolean) {
    const result = await toggleProductMediaActive(mediaId, isActive);
    if (!result.success) {
      setError(result.error);
      return;
    }
    await refreshColors();
  }

  async function handleAltText(mediaId: string, altText: string) {
    const result = await updateProductMediaAltText(mediaId, altText);
    if (!result.success) {
      setError(result.error);
      return;
    }
    await refreshColors();
  }

  if (loading) {
    return <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">جارٍ تحميل الصور…</div>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-brown">الصور</h3>
            <p className="text-sm text-muted">تُظهر كل لون صورًا مستقلة مع صورة رئيسية وترتيب قابل للتعديل.</p>
          </div>
          {selectedColor && (
            <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm text-brown transition hover:border-gold hover:text-gold">
              <input
                type="file"
                multiple
                accept={ALLOWED_MIME_TYPES.join(",")}
                className="hidden"
                onChange={(event) => {
                  void handleUpload(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
              <span className="inline-flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                إضافة صور
              </span>
            </label>
          )}
        </div>
      </div>

      {selectedColor ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brown">{selectedColor.color}</p>
                <p className="text-xs text-muted">الصور: {selectedColor.media.length} • الحد الأقصى: {formatBytes(MAX_UPLOAD_BYTES)}</p>
              </div>
              <div className="text-xs text-muted">{selectedColor.media.filter((item) => item.isPrimary).length} صورة رئيسية</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {selectedColor.media.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.isPrimary && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">رئيسية</span>}
                    {!item.isActive && <span className="rounded-full bg-muted/10 px-2 py-0.5 text-[11px] font-semibold text-muted">مخفية</span>}
                  </div>
                  <div className="flex items-center gap-2 text-muted">
                    <button type="button" className="rounded p-1 hover:text-gold" onClick={() => setActivePreview(item)} title="عرض الصورة">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Image src={item.url} alt={item.altText || selectedColor.color} width={640} height={480} className="h-44 w-full object-cover" />
                </div>
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    defaultValue={item.altText || ""}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    placeholder="Alt Text"
                    onBlur={(event) => void handleAltText(item.id, event.currentTarget.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void handlePrimary(item.id)}>
                      <Check className="h-4 w-4" />
                      جعل رئيسية
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void handleToggle(item.id, !item.isActive)}>
                      {item.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {item.isActive ? "إخفاء" : "إظهار"}
                    </Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => void handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted">لا توجد ألوان متاحة بعد.</div>
      )}

      {uploading && <div className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-sm text-brown">جارٍ رفع الصور…</div>}

      {activePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setActivePreview(null)}>
          <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl bg-white p-2" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white" onClick={() => setActivePreview(null)}>
              <X className="h-5 w-5" />
            </button>
            <Image src={activePreview.url} alt={activePreview.altText || "image preview"} width={1280} height={960} className="max-h-[85vh] w-auto max-w-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
