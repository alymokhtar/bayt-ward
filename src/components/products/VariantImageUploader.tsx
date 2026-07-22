"use client";

import { uploadProductImage } from "@/lib/actions/product-media";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/product-media-constants";
import type { ProductImageItem } from "@/lib/types/product-media";
import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type VariantImageUploaderProps = {
  productId: string;
  productVariantId: string;
  label: string;
  initialImages: ProductImageItem[];
};

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VariantImageUploader({
  productId,
  productVariantId,
  label,
  initialImages,
}: VariantImageUploaderProps) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <p className="text-sm font-medium text-brown">صور المتغير</p>
          <p className="text-xs text-muted">
            {images.length} صورة • الحد الأقصى {formatBytes(MAX_UPLOAD_BYTES)}
          </p>
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
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((item) => (
            <div key={item.id} className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
              <Image src={item.url} alt={item.altText || label} fill sizes="64px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="mt-3 text-sm text-muted">
          جارٍ رفع الصور...
        </div>
      )}

    </div>
  );
}
