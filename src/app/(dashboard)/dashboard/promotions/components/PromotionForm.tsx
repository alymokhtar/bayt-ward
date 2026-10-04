"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { getCairoDateString } from "@/lib/promotion-date";
import { useState, type FormEvent } from "react";
import { createPromotion, updatePromotion } from "../actions";
import {
  PROMOTION_TYPES,
  type PromotionFormOptions,
  type PromotionInput,
  type PromotionRecord,
  type PromotionType,
} from "../types";

interface PromotionFormProps {
  isOpen: boolean;
  promotion: PromotionRecord | null;
  options: PromotionFormOptions;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function dateInputValue(value: Date | null | undefined): string {
  if (!value || !Number.isFinite(value.getTime())) return "";
  return getCairoDateString(value);
}

function numberValue(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function PromotionForm({
  isOpen,
  promotion,
  options,
  onClose,
  onSaved,
}: PromotionFormProps) {
  const [name, setName] = useState(promotion?.name ?? "");
  const [description, setDescription] = useState(promotion?.description ?? "");
  const [type, setType] = useState<PromotionType>(promotion?.type ?? PROMOTION_TYPES.BUY_X_GET_Y);
  const [buyQuantity, setBuyQuantity] = useState(numberValue(promotion?.buyQuantity));
  const [getQuantity, setGetQuantity] = useState(numberValue(promotion?.getQuantity));
  const [discountPercent, setDiscountPercent] = useState(
    numberValue(promotion?.discountPercent) || "100",
  );
  const [discountAmount, setDiscountAmount] = useState(numberValue(promotion?.discountAmount));
  const [minOrderAmount, setMinOrderAmount] = useState(numberValue(promotion?.minOrderAmount));
  const [startDate, setStartDate] = useState(dateInputValue(promotion?.startDate));
  const [endDate, setEndDate] = useState(dateInputValue(promotion?.endDate));
  const [isStoreOnly, setIsStoreOnly] = useState(promotion?.isStoreOnly ?? false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    promotion?.categories.map(({ id }) => id) ?? [],
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    promotion?.products.map(({ id }) => id) ?? [],
  );
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedProductSearch = productSearch.trim().toLocaleLowerCase();
  const filteredProducts = options.products.filter((product) => {
    const matchesCategory =
      selectedCategoryIds.length === 0 || selectedCategoryIds.includes(product.categoryId);
    const matchesSearch =
      !normalizedProductSearch ||
      product.name.toLocaleLowerCase().includes(normalizedProductSearch) ||
      product.skus.some((sku) => sku.toLocaleLowerCase().includes(normalizedProductSearch));

    return matchesCategory && matchesSearch;
  });
  const hiddenSelectedProductCount = selectedProductIds.filter(
    (id) => !filteredProducts.some((product) => product.id === id),
  ).length;

  function toggleSelection(
    selectedIds: string[],
    setSelectedIds: (ids: string[]) => void,
    id: string,
  ) {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const input: PromotionInput = {
      name,
      description,
      type,
      buyQuantity: type === PROMOTION_TYPES.BUY_X_GET_Y ? parseOptionalNumber(buyQuantity) : null,
      getQuantity: type === PROMOTION_TYPES.BUY_X_GET_Y ? parseOptionalNumber(getQuantity) : null,
      discountPercent:
        type === PROMOTION_TYPES.BUY_X_GET_Y || type === PROMOTION_TYPES.PERCENTAGE
          ? parseOptionalNumber(discountPercent)
          : null,
      discountAmount:
        type === PROMOTION_TYPES.FIXED_AMOUNT ? parseOptionalNumber(discountAmount) : null,
      minOrderAmount:
        type === PROMOTION_TYPES.PERCENTAGE || type === PROMOTION_TYPES.FIXED_AMOUNT
          ? parseOptionalNumber(minOrderAmount)
          : null,
      startDate,
      endDate,
      isActive: promotion?.isActive ?? true,
      isStoreOnly,
      categoryIds: selectedCategoryIds,
      productIds: selectedProductIds,
    };

    try {
      const result = promotion
        ? await updatePromotion(promotion.id, input)
        : await createPromotion(input);

      if (result.success) {
        onSaved(promotion ? "تم تحديث العرض بنجاح" : "تم إنشاء العرض بنجاح");
      } else {
        setError(result.error);
      }
    } catch {
      setError("تعذر حفظ العرض. حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  const closeIfIdle = () => {
    if (!loading) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeIfIdle}
      title={promotion ? "تعديل العرض" : "عرض جديد"}
      description="حدد آلية الخصم والفترة والمنتجات المشمولة"
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={closeIfIdle} disabled={loading}>
            إلغاء
          </Button>
          <Button type="submit" form="promotion-form" loading={loading}>
            {promotion ? "حفظ التعديلات" : "إنشاء العرض"}
          </Button>
        </>
      }
    >
      <form id="promotion-form" onSubmit={handleSubmit} className="space-y-5" dir="rtl">
        {error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="اسم العرض"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            required
          />
          <Select
            label="نوع العرض"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as PromotionType)}
            options={[
              { value: PROMOTION_TYPES.BUY_X_GET_Y, label: "اشترِ X واحصل على Y" },
              { value: PROMOTION_TYPES.PERCENTAGE, label: "خصم نسبة مئوية" },
              { value: PROMOTION_TYPES.FIXED_AMOUNT, label: "خصم مبلغ ثابت" },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="promotion-description" className="block text-sm font-medium text-brown">
            الوصف
          </label>
          <textarea
            id="promotion-description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-brown focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
        </div>

        {type === PROMOTION_TYPES.BUY_X_GET_Y && (
          <div className="grid gap-4 rounded-md border border-orange-200 bg-orange-50/60 p-4 sm:grid-cols-3">
            <Input
              label="اشترِ كمية"
              type="number"
              min="1"
              step="1"
              value={buyQuantity}
              onChange={(event) => setBuyQuantity(event.target.value)}
              required
            />
            <Input
              label="احصل على كمية"
              type="number"
              min="1"
              step="1"
              value={getQuantity}
              onChange={(event) => setGetQuantity(event.target.value)}
              required
            />
            <Input
              label="خصم القطع المستحقة (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discountPercent}
              onChange={(event) => setDiscountPercent(event.target.value)}
              required
            />
          </div>
        )}

        {type === PROMOTION_TYPES.PERCENTAGE && (
          <div className="grid gap-4 rounded-md border border-sky-200 bg-sky-50/60 p-4 sm:grid-cols-2">
            <Input
              label="نسبة الخصم (%)"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={discountPercent}
              onChange={(event) => setDiscountPercent(event.target.value)}
              required
            />
            <Input
              label="الحد الأدنى للطلب"
              type="number"
              min="0"
              step="0.01"
              value={minOrderAmount}
              onChange={(event) => setMinOrderAmount(event.target.value)}
            />
          </div>
        )}

        {type === PROMOTION_TYPES.FIXED_AMOUNT && (
          <div className="grid gap-4 rounded-md border border-green-200 bg-green-50/60 p-4 sm:grid-cols-2">
            <Input
              label="قيمة الخصم"
              type="number"
              min="0.01"
              step="0.01"
              value={discountAmount}
              onChange={(event) => setDiscountAmount(event.target.value)}
              required
            />
            <Input
              label="الحد الأدنى للطلب"
              type="number"
              min="0"
              step="0.01"
              value={minOrderAmount}
              onChange={(event) => setMinOrderAmount(event.target.value)}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="تاريخ البداية"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="تاريخ النهاية"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gold/40 bg-gold/5 p-4 text-sm text-brown">
          <input
            type="checkbox"
            checked={isStoreOnly}
            onChange={(event) => setIsStoreOnly(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-gold focus:ring-gold"
          />
          <span className="font-medium">العرض متوفر حصرياً داخل المحل فقط</span>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset className="min-w-0 space-y-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-brown">الأقسام المستهدفة</legend>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted" aria-live="polite">
                تم تحديد {selectedCategoryIds.length} {selectedCategoryIds.length === 1 ? "قسم" : "أقسام"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategoryIds(options.categories.map(({ id }) => id))}
                className="rounded-md border border-gold/30 px-2.5 py-1.5 text-xs font-medium text-brown transition hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryIds([])}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-cream-dark/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                إلغاء تحديد الكل
              </button>
            </div>
            <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {options.categories.map((category) => {
                const checked = selectedCategoryIds.includes(category.id);
                const checkboxId = `promotion-category-${category.id}`;

                return (
                  <label
                    key={category.id}
                    htmlFor={checkboxId}
                    className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${checked ? "border-gold/50 bg-gold/10 text-brown" : "border-border bg-white text-brown hover:bg-cream-dark/40"}`}
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelection(selectedCategoryIds, setSelectedCategoryIds, category.id)}
                      className="h-4 w-4 shrink-0 rounded border-border accent-gold focus:ring-gold"
                    />
                    <span className="min-w-0 truncate">{category.name}</span>
                  </label>
                );
              })}
              {options.categories.length === 0 && (
                <p className="col-span-full py-4 text-center text-xs text-muted">لا توجد أقسام متاحة</p>
              )}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-brown">المنتجات المستهدفة</legend>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted" aria-live="polite">
                تم تحديد {selectedProductIds.length} {selectedProductIds.length === 1 ? "منتج" : "منتجات"}
              </span>
            </div>
            <Input
              id="promotion-product-search"
              aria-label="بحث المنتجات أو SKU"
              placeholder="ابحث بالاسم أو SKU"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedProductIds((current) =>
                    [...new Set([...current, ...filteredProducts.map(({ id }) => id)])],
                  )
                }
                className="rounded-md border border-gold/30 px-2.5 py-1.5 text-xs font-medium text-brown transition hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                تحديد المعروض ({filteredProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-cream-dark/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                إلغاء التحديد
              </button>
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-border bg-white p-2">
              {filteredProducts.map((product) => {
                const checked = selectedProductIds.includes(product.id);
                const checkboxId = `promotion-product-${product.id}`;

                return (
                  <label
                    key={product.id}
                    htmlFor={checkboxId}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${checked ? "bg-gold/10 text-brown" : "text-brown hover:bg-cream-dark/40"}`}
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelection(selectedProductIds, setSelectedProductIds, product.id)}
                      className="h-4 w-4 shrink-0 rounded border-border accent-gold focus:ring-gold"
                    />
                    <span className="min-w-0 flex-1 truncate">{product.name}</span>
                    {product.skus.length > 0 && (
                      <span className="max-w-28 shrink-0 truncate text-[11px] text-muted" dir="ltr">
                        {product.skus.slice(0, 2).join(" · ")}
                      </span>
                    )}
                  </label>
                );
              })}
              {filteredProducts.length === 0 && (
                <p className="py-6 text-center text-xs text-muted">
                  {options.products.length === 0 ? "لا توجد منتجات متاحة" : "لا توجد منتجات مطابقة"}
                </p>
              )}
            </div>
            {hiddenSelectedProductCount > 0 && (
              <p className="text-xs text-muted">
                {hiddenSelectedProductCount} منتج محدد خارج نتائج التصفية، وسيظل ضمن العرض.
              </p>
            )}
          </fieldset>
        </div>

        <p className="rounded-md bg-cream-dark/40 px-3 py-2.5 text-xs leading-5 text-muted">
          تنويه: إذا تركت الأقسام والمنتجات بدون تحديد، سيتم تطبيق العرض تلقائياً على كل منتجات المتجر.
        </p>
      </form>
    </Modal>
  );
}