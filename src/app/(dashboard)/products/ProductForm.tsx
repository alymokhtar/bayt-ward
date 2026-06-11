"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { COLORS, SIZES } from "@/lib/constants";
import {
  createProduct,
  updateProduct,
  type VariantInput,
} from "@/lib/actions/products";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = { id: string; name: string; nameAr: string | null };

type ProductData = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  brand: string | null;
  categoryId: string;
  imageUrl: string | null;
  isActive: boolean;
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    size: string;
    color: string;
    colorHex: string | null;
    costPrice: number;
    sellingPrice: number;
    stockQuantity: number;
    minStockLevel: number;
    isActive: boolean;
  }[];
};

interface ProductFormProps {
  categories: Category[];
  product?: ProductData;
}

type VariantForm = VariantInput & { id?: string; isActive?: boolean };

const emptyVariant = (): VariantForm => ({
  sku: "",
  barcode: "",
  size: "M",
  color: "أسود",
  colorHex: "#000000",
  costPrice: 0,
  sellingPrice: 0,
  stockQuantity: 0,
  minStockLevel: 5,
});

export default function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name || "");
  const [nameAr, setNameAr] = useState(product?.nameAr || "");
  const [description, setDescription] = useState(product?.description || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [categoryId, setCategoryId] = useState(product?.categoryId || "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [variants, setVariants] = useState<VariantForm[]>(
    product?.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode || "",
      size: v.size,
      color: v.color,
      colorHex: v.colorHex || "",
      costPrice: v.costPrice,
      sellingPrice: v.sellingPrice,
      stockQuantity: v.stockQuantity,
      minStockLevel: v.minStockLevel,
      isActive: v.isActive,
    })) || [emptyVariant()]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateVariant(index: number, field: keyof VariantForm, value: string | number | boolean) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  function addVariant() {
    setVariants((prev) => [...prev, emptyVariant()]);
  }

  function removeVariant(index: number) {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      name,
      nameAr: nameAr || undefined,
      description: description || undefined,
      brand: brand || undefined,
      categoryId,
      imageUrl: imageUrl || undefined,
      variants: variants.map((v) => ({
        ...v,
        id: v.id,
        isActive: v.isActive ?? true,
        barcode: v.barcode || undefined,
        colorHex: v.colorHex || undefined,
      })),
    };

    const result = isEdit
      ? await updateProduct(product!.id, { ...payload, isActive })
      : await createProduct(payload);

    setLoading(false);

    if (result.success) {
      router.push("/products");
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.nameAr || c.name,
  }));

  const sizeOptions = SIZES.map((s) => ({ value: s, label: s }));
  const colorOptions = COLORS.map((c) => ({ value: c.name, label: c.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-white p-6 space-y-4">
        <h2 className="font-semibold text-brown">معلومات المنتج</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="الاسم (إنجليزي)" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="الاسم (عربي)" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          <Input label="العلامة التجارية" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <Select
            label="التصنيف"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="اختر التصنيف"
            required
          />
          <Input
            label="رابط الصورة"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            dir="ltr"
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-brown mb-1.5">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border px-4 py-2 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
            />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-brown">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border"
              />
              منتج نشط
            </label>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-brown">المتغيرات (المقاسات والألوان)</h2>
          <Button type="button" variant="outline" size="sm" onClick={addVariant}>
            <Plus className="h-4 w-4" />
            إضافة متغير
          </Button>
        </div>

        {variants.map((variant, index) => (
          <div
            key={variant.id || index}
            className="rounded-lg border border-border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">
                متغير #{index + 1}
              </span>
              {variants.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVariant(index)}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="SKU"
                value={variant.sku}
                onChange={(e) => updateVariant(index, "sku", e.target.value)}
                required
                dir="ltr"
              />
              <Input
                label="الباركود"
                value={variant.barcode || ""}
                onChange={(e) => updateVariant(index, "barcode", e.target.value)}
                dir="ltr"
              />
              <Select
                label="المقاس"
                options={sizeOptions}
                value={variant.size}
                onChange={(e) => updateVariant(index, "size", e.target.value)}
              />
              <Select
                label="اللون"
                options={colorOptions}
                value={variant.color}
                onChange={(e) => {
                  const color = COLORS.find((c) => c.name === e.target.value);
                  updateVariant(index, "color", e.target.value);
                  if (color) updateVariant(index, "colorHex", color.hex);
                }}
              />
              <Input
                label="سعر التكلفة"
                type="number"
                min={0}
                step={0.01}
                value={variant.costPrice}
                onChange={(e) =>
                  updateVariant(index, "costPrice", parseFloat(e.target.value) || 0)
                }
                required
              />
              <Input
                label="سعر البيع"
                type="number"
                min={0}
                step={0.01}
                value={variant.sellingPrice}
                onChange={(e) =>
                  updateVariant(index, "sellingPrice", parseFloat(e.target.value) || 0)
                }
                required
              />
              {!isEdit && (
                <Input
                  label="الكمية الافتتاحية"
                  type="number"
                  min={0}
                  value={variant.stockQuantity ?? 0}
                  onChange={(e) =>
                    updateVariant(index, "stockQuantity", parseInt(e.target.value) || 0)
                  }
                />
              )}
              <Input
                label="الحد الأدنى للمخزون"
                type="number"
                min={0}
                value={variant.minStockLevel ?? 5}
                onChange={(e) =>
                  updateVariant(index, "minStockLevel", parseInt(e.target.value) || 5)
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          {isEdit ? "حفظ التعديلات" : "إنشاء المنتج"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
