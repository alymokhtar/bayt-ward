"use client";

import { deleteProductImage, uploadProductImage, setPrimaryProductImage } from "@/lib/actions/product-media";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/product-media-constants";
import type { ProductImageItem } from "@/lib/types/product-media";
import { Eye, EyeOff, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type VariantImageUploaderProps = {
  productId: string;
  productVariantId: string;
  label: string;
  initialImages: ProductImageItem[];
  primaryImageId: string | null;
  onMakePrimary: (mediaId: string | null) => void;
};

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VariantImageUploader({
  productId,
  productVariantId,
  label,
  initialImages,
  primaryImageId,
  onMakePrimary,
}: VariantImageUploaderProps) {
  const [images, setImages] = useState(initialImages);
  const [activePreview, setActivePreview] = useState<ProductImageItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPrimaryId, setLoadingPrimaryId] = useState<string | null>(null);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  useEffect(() => {
    setImages((current) =>
      current.map((image) => ({
        ...image,
        isPrimary: image.id === primaryImageId,
      }))
    );
  }, [primaryImageId]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;

    setError(null);
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("productId", productId);
        formData.append("productVariantId", productVariantId);
        formData.append("altText", label);
        formData.append("file", file);

        const result = await uploadProductImage(formData);
        if (!result.success) {
          throw new Error(result.error);
        }

        setImages((current) => [...current, result.data]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brown">
            {label ? `صور المتغير: ${label}` : "صور المتغير"}
          </p>
          <p className="text-xs text-muted">
            {images.length} صورة • الحد الأقصى {formatBytes(MAX_UPLOAD_BYTES)}
          </p>
          {label && (
            <p className="text-xs text-muted">الصور ستُربط بلون مركزي: {label}</p>
          )}
        </div>
        <label className="cursor-pointer">
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
          <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-brown transition hover:border-gold hover:text-gold">
            <ImagePlus className="h-4 w-4" />
            إضافة صور
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((item) => {
            const isPrimary = primaryImageId === item.id;

            return (
              <div key={item.id} className="group rounded-2xl border border-border bg-white shadow-sm">
                <div className="relative overflow-hidden rounded-t-2xl border-b border-border bg-slate-50">
                  <Image src={item.url} alt={item.altText || label} width={400} height={300} className="h-44 w-full object-cover transition duration-200 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 transition duration-200 group-hover:bg-black/20" />
                  <button
                    type="button"
                    className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-white"
                    title="عرض الصورة"
                    onClick={() => setActivePreview(item)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {isPrimary && (
                    <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-1 text-[11px] font-semibold uppercase text-white shadow-sm">
                      رئيسية
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3 p-3">
                  <div className="min-h-[2rem] text-sm text-slate-700">{item.altText || label}</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        isPrimary ? "border-gold bg-gold/10 text-gold" : "border-border bg-white text-slate-600 hover:border-gold hover:text-gold"
                      }`}
                      onClick={async () => {
                        setError(null);
                        setLoadingPrimaryId(item.id);
                        try {
                          const result = await setPrimaryProductImage(item.id);
                          if (!result.success) {
                            setError(result.error);
                            setLoadingPrimaryId(null);
                            return;
                          }
                          onMakePrimary(item.id);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "فشل تعيين الصورة الرئيسية");
                        } finally {
                          setLoadingPrimaryId(null);
                        }
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {loadingPrimaryId === item.id ? "جاري..." : "جعل رئيسية"}
                    </button>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        item.isActive
                          ? "border-border bg-white text-slate-600 hover:border-gold hover:text-gold"
                          : "border-slate-300 bg-slate-100 text-slate-500"
                      }`}
                      onClick={() => {
                        setImages((current) =>
                          current.map((image) =>
                            image.id === item.id ? { ...image, isActive: !image.isActive } : image
                          )
                        );
                      }}
                    >
                      {item.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {item.isActive ? "إخفاء" : "إظهار"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-danger hover:bg-red-100"
                      onClick={async () => {
                        setError(null);

                        const confirmed = window.confirm("هل أنت متأكد من حذف هذه الصورة نهائياً؟");
                        if (!confirmed) {
                          return;
                        }

                        const result = await deleteProductImage(item.id, item.publicId);
                        if (!result.success) {
                          setError(result.error);
                          return;
                        }

                        setImages((current) => current.filter((image) => image.id !== item.id));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {activePreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setActivePreview(null)}>
              <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl bg-white p-3" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow border border-border text-slate-700"
                  onClick={() => setActivePreview(null)}
                >
                  ×
                </button>
                <Image src={activePreview.url} alt={activePreview.altText || label} width={1280} height={960} className="max-h-[80vh] w-auto max-w-full object-contain" />
              </div>
            </div>
          )}
        </div>
      )}

      {uploading && (
        <div className="mt-3 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-sm text-brown">
          جارٍ رفع الصور...
        </div>
      )}

    </div>
  );
}
