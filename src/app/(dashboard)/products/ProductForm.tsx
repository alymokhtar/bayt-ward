"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { SIZES } from "@/lib/constants";
import { resolveStoredBarcode } from "@/lib/barcode";
import {
  CUSTOM_SIZE_OPTION_VALUE,
  getVariantSizeMode,
  getVariantSizeSelectValue,
  resolveVariantSize,
} from "@/lib/variant-size";
import {
  findVariantCodeIssues,
  registerVariantCodes,
} from "@/lib/variant-codes";
import {
  createProduct,
  getNextVariantCodes,
  updateProduct,
  type VariantCodePair,
  type VariantInput,
} from "@/lib/actions/products";
import { getDeletedVariantIds } from "@/lib/variant-sync";
import VariantImageUploader from "@/components/products/VariantImageUploader";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Category = { id: string; name: string; nameAr: string | null };

type ProductData = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  brand: string | null;
  categoryId: string;
  publishToWebsite: boolean;
  featuredProduct: boolean;
  isActive: boolean;
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    size: string;
    color: string;
    colorHex: string | null;
    globalColorId?: string | null;
    costPrice: number;
    sellingPrice: number;
    stockQuantity: number;
    minStockLevel: number;
    isActive: boolean;
    images: {
      id: string;
      url: string;
      publicId: string;
      altText: string | null;
      sortOrder: number;
      isPrimary: boolean;
      isActive: boolean;
    }[];
  }[];
};

type GlobalColor = {
  id: string;
  name: string;
  hexCode: string;
};

interface ProductFormProps {
  categories: Category[];
  product?: ProductData;
  globalColors?: GlobalColor[];
  initialVariantCode?: VariantCodePair;
}

type VariantForm = VariantInput & {
  id?: string;
  isActive?: boolean;
  sizeMode?: "preset" | "custom";
  customSize?: string;
  globalColorId?: string;
};

const emptyVariant = (
  template?: VariantForm,
  codes?: VariantCodePair
): VariantForm => ({
  sku: codes?.sku ?? "",
  barcode: codes?.barcode ?? "",
  size: template?.size ?? "M",
  color: "",
  colorHex: "",
  globalColorId: undefined,
  costPrice: template?.costPrice ?? 0,
  sellingPrice: template?.sellingPrice ?? 0,
  stockQuantity: 0,
  minStockLevel: template?.minStockLevel ?? 5,
  sizeMode: template?.sizeMode ?? "preset",
  customSize: template?.customSize ?? "",
});

export default function ProductForm({
  categories,
  product,
  globalColors = [],
  initialVariantCode,
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name || "");
  const [nameAr, setNameAr] = useState(product?.nameAr || "");
  const [description, setDescription] = useState(product?.description || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [categoryId, setCategoryId] = useState(product?.categoryId || "");
  const [publishToWebsite, setPublishToWebsite] = useState(product?.publishToWebsite ?? false);
  const [featuredProduct, setFeaturedProduct] = useState(product?.featuredProduct ?? false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [variants, setVariants] = useState<VariantForm[]>(
    product?.variants.map((v) => {
      const sizeMode = getVariantSizeMode(v.size);
      return {
        id: v.id,
        sku: v.sku,
        barcode: v.barcode || "",
        size: v.size,
        color: v.color,
        colorHex: v.colorHex || "",
        globalColorId: v.globalColorId || undefined,
        costPrice: v.costPrice,
        sellingPrice: v.sellingPrice,
        stockQuantity: v.stockQuantity,
        minStockLevel: v.minStockLevel,
        isActive: v.isActive,
        sizeMode,
        customSize: sizeMode === "custom" ? v.size : "",
      };
    }) || [emptyVariant(undefined, initialVariantCode)]
  );
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [addingVariant, setAddingVariant] = useState(false);
  const [error, setError] = useState("");
  const [variantErrors, setVariantErrors] = useState<Record<number, string>>({});
  const [primaryImageId, setPrimaryImageId] = useState<string | null>(() => {
    if (!product) return null;
    const primaryImage = product.variants
      .flatMap((variant) => variant.images)
      .find((image) => image.isPrimary);
    return primaryImage?.id ?? null;
  });

  useEffect(() => {
    if (isEdit || initialVariantCode) return;

    let cancelled = false;

    async function assignInitialCodes() {
      const result = await getNextVariantCodes(1);
      if (cancelled || !result.success) return;

      setVariants((prev) => {
        if (prev.some((v) => v.sku.trim())) return prev;
        return prev.map((v, i) =>
          i === 0 ? { ...v, ...result.data[0] } : v
        );
      });
    }

    void assignInitialCodes();

    return () => {
      cancelled = true;
    };
  }, [isEdit, initialVariantCode]);

  function updateVariant(
    index: number,
    field: keyof VariantForm,
    value: string | number | boolean
  ) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  function selectGlobalColor(index: number, color: GlobalColor) {
    setVariants((prev) => {
      const next = prev.map((v, i) =>
        i === index
          ? {
              ...v,
              globalColorId: color.id,
              color: color.name,
              colorHex: color.hexCode,
            }
          : v
      );

      const duplicate = next.some((variant, variantIndex) => {
        if (variantIndex === index) return false;
        return variant.globalColorId === color.id;
      });

      if (duplicate) {
        setError(`لا يمكن اختيار هذا اللون أكثر من مرة لنفس المنتج`);
        return prev;
      }

      setError("");
      setVariantErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[index];
        return nextErrors;
      });
      return next;
    });
  }

  function clearGlobalColor(index: number) {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === index
          ? {
              ...v,
              globalColorId: undefined,
              color: "",
              colorHex: "",
            }
          : v
      )
    );
  }

  function updateVariantSize(index: number, mode: "preset" | "custom", value: string) {
    setVariants((prev) =>
      prev.map((variant, variantIndex) => {
        if (variantIndex !== index) return variant;

        if (mode === "custom") {
          return {
            ...variant,
            sizeMode: "custom",
            customSize: value,
            size: CUSTOM_SIZE_OPTION_VALUE,
          };
        }

        return {
          ...variant,
          sizeMode: "preset",
          customSize: "",
          size: value,
        };
      })
    );
  }

  async function addVariant() {
    setAddingVariant(true);
    setError("");

    const pending = variants.map((v) => ({
      sku: v.sku,
      barcode: v.barcode || null,
    }));
    const result = await getNextVariantCodes(1, pending);
    setAddingVariant(false);

    if (!result.success) {
      setError(result.error ?? "تعذّر توليد أكواد المتغير");
      return;
    }

    const codes = result.data[0];
    setVariants((prev) => {
      const template = prev[0];
      return [...prev, emptyVariant(template, codes)];
    });
  }

  function removeVariant(index: number) {
    if (variants.length <= 1) return;

    const confirmed = window.confirm(
      "هل أنت متأكد من إخفاء هذا المتغير؟ سيتم أرشفته بدلًا من حذفه نهائيًا."
    );
    if (!confirmed) return;

    setVariants((prev) => {
      const target = prev[index];
      if (target?.id) {
        setDeletedVariantIds((current) =>
          current.includes(target.id!) ? current : [...current, target.id!]
        );
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function validateLocalVariantCodes(): string | null {
    const usedCodes = new Set<string>();

    for (const variant of variants) {
      const sku = variant.sku.trim();
      const barcode = resolveStoredBarcode(sku, variant.barcode);
      const issues = findVariantCodeIssues(sku, barcode, usedCodes);
      if (issues.length > 0) return issues[0].message;
      registerVariantCodes(sku, barcode, usedCodes);
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const localCodeError = validateLocalVariantCodes();
    if (localCodeError) {
      setError(localCodeError);
      return;
    }

    for (const variant of variants) {
      const mode = variant.sizeMode ?? getVariantSizeMode(variant.size);
      const resolvedSize = resolveVariantSize(mode, mode === "custom" ? variant.customSize : variant.size);
      if (mode === "custom" && !resolvedSize.trim()) {
        setError("أدخل المقاس المخصص لكل متغير تم اختياره كـ مقاس مخصص");
        return;
      }
    }

    const colorSelectionErrors: Record<number, string> = {};
    variants.forEach((variant, index) => {
      if (!variant.globalColorId) {
        colorSelectionErrors[index] = "يرجى اختيار لون لهذا المتغير";
      }
    });

    if (Object.keys(colorSelectionErrors).length > 0) {
      setVariantErrors(colorSelectionErrors);
      setError("يرجى اختيار لون مركزي لكل المتغيرات");
      return;
    }

    setLoading(true);

    const existingVariantIds = product?.variants.map((variant) => variant.id) ?? [];
    const incomingVariantIds = variants
      .map((variant) => variant.id)
      .filter((id): id is string => Boolean(id));
    const resolvedDeletedVariantIds = getDeletedVariantIds(
      existingVariantIds,
      incomingVariantIds,
      deletedVariantIds
    );

    const payload = {
      name,
      nameAr: nameAr || undefined,
      description: description || undefined,
      brand: brand || undefined,
      categoryId,
      publishToWebsite,
      featuredProduct,
      deletedVariantIds: resolvedDeletedVariantIds,
      variants: variants.map((v) => {
        const mode = v.sizeMode ?? getVariantSizeMode(v.size);
        const resolvedSize = resolveVariantSize(mode, mode === "custom" ? v.customSize : v.size);

        return {
          id: v.id || undefined,
          sku: String(v.sku).trim(),
          barcode: v.barcode ? String(v.barcode).trim() : undefined,
          size: String(resolvedSize).trim(),
          color: String(v.color).trim(),
          colorHex: v.colorHex ? String(v.colorHex).trim() : undefined,
          globalColorId: v.globalColorId || undefined,
          costPrice: typeof v.costPrice === "number" ? v.costPrice : parseFloat(String(v.costPrice) || "0"),
          sellingPrice: typeof v.sellingPrice === "number" ? v.sellingPrice : parseFloat(String(v.sellingPrice) || "0"),
          stockQuantity: typeof v.stockQuantity === "number" ? v.stockQuantity : parseInt(String(v.stockQuantity) || "0"),
          minStockLevel: typeof v.minStockLevel === "number" ? v.minStockLevel : parseInt(String(v.minStockLevel) || "5"),
          isActive: v.isActive ?? true,
        };
      }),
    };

    const result = isEdit
      ? await updateProduct(product!.id, { ...payload, isActive, publishToWebsite, featuredProduct })
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

  const sizeOptions = [
    ...SIZES.map((s) => ({ value: s, label: s })),
    { value: CUSTOM_SIZE_OPTION_VALUE, label: "مقاس مخصص" },
  ];

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
          <label className="flex items-center gap-2 text-sm text-brown">
            <input
              type="checkbox"
              checked={publishToWebsite}
              onChange={(e) => setPublishToWebsite(e.target.checked)}
              className="rounded border-border"
            />
            Publish To Website
          </label>
          <label className="flex items-center gap-2 text-sm text-brown">
            <input
              type="checkbox"
              checked={featuredProduct}
              onChange={(e) => setFeaturedProduct(e.target.checked)}
              className="rounded border-border"
            />
            Featured Product
          </label>
        </div>
      </div>

      {/* Middle product colors/images section removed — image uploads are handled per-variant below */}

      <div className="rounded-xl border border-border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-brown">المتغيرات (المقاسات والألوان)</h2>
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
                  title="إخفاء المتغير (أرشفة)"
                  aria-label="إخفاء المتغير (أرشفة)"
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
                hint={!isEdit ? "يُولَّد تلقائياً — يجب أن يكون فريداً لكل متغير" : "يجب أن يكون فريداً لكل متغير"}
              />
              <Input
                label="الباركود"
                value={variant.barcode || ""}
                onChange={(e) => updateVariant(index, "barcode", e.target.value)}
                dir="ltr"
                hint={
                  !isEdit
                    ? "يُولَّد تلقائياً (CODE128) — فريد لكل متغير ولا يُكرَّر مع SKU"
                    : "فريد لكل متغير — يُستخدم للمسح والطباعة"
                }
              />
              <div className="space-y-3">
                <Select
                  label="المقاس"
                  options={sizeOptions}
                  value={getVariantSizeSelectValue(variant.size, variant.sizeMode)}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    if (selectedValue === CUSTOM_SIZE_OPTION_VALUE) {
                      updateVariantSize(index, "custom", variant.customSize || "");
                    } else {
                      updateVariantSize(index, "preset", selectedValue);
                    }
                  }}
                />
                {variant.sizeMode === "custom" && (
                  <Input
                    label="المقاس المخصص"
                    value={variant.customSize || ""}
                    onChange={(e) => updateVariantSize(index, "custom", e.target.value)}
                    placeholder="اكتب المقاس يدويًا"
                    required
                  />
                )}
              </div>
              <div className={`sm:col-span-3 rounded-2xl p-3 ${variantErrors[index] ? "border border-red-300 bg-red-50" : ""}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className={`block text-sm font-medium ${variantErrors[index] ? "text-danger" : "text-brown"}`}>
                    اللون المركزي
                  </label>
                  {variant.globalColorId && (
                    <button
                      type="button"
                      className="text-xs text-muted transition hover:text-brown"
                      onClick={() => clearGlobalColor(index)}
                    >
                      × إزالة الاختيار
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {globalColors.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-cream px-3 py-3 text-sm text-muted">
                      لا توجد ألوان مركزية مسجلة.
                    </div>
                  ) : (
                    globalColors.map((color) => {
                      const selected = variant.globalColorId === color.id;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => selectGlobalColor(index, color)}
                          className={`group inline-flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl border px-1 py-1 text-center text-[9px] transition ${
                            selected
                              ? "border-gold bg-gold/10 shadow-sm ring-2 ring-gold/30"
                              : "border-border bg-white hover:border-gold/80"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                              selected ? "border-gold" : "border-border"
                            }`}
                            style={{ backgroundColor: color.hexCode }}
                          />
                          <span className="max-w-[56px] truncate text-[9px] font-medium text-brown">
                            {color.name}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                {variantErrors[index] && (
                  <p className="mt-2 text-sm text-danger">{variantErrors[index]}</p>
                )}
              </div>
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
            {isEdit && product && (
              variant.id ? (
                <VariantImageUploader
                  productId={product.id}
                  productVariantId={variant.id}
                  label={`${globalColors.find((color) => color.id === variant.globalColorId)?.name || variant.color || product.name} ${variant.size}`.trim()}
                  initialImages={
                    product.variants.find((item) => item.id === variant.id)?.images ?? []
                  }
                  primaryImageId={primaryImageId}
                  onMakePrimary={setPrimaryImageId}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/5 p-3 text-sm text-muted">
                  احفظ المنتج أولاً حتى يمكن رفع صور لهذا المتغير.
                </div>
              )
            )}
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVariant}
            loading={addingVariant}
          >
            <Plus className="h-4 w-4" />
            إضافة متغير
          </Button>
        </div>
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
