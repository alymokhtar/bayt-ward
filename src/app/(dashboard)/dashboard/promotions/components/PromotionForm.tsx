"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
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
  return value.toISOString().slice(0, 10);
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
  const [categoryIds, setCategoryIds] = useState<string[]>(
    promotion?.categories.map(({ id }) => id) ?? [],
  );
  const [productIds, setProductIds] = useState<string[]>(
    promotion?.products.map(({ id }) => id) ?? [],
  );
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredProducts = options.products.filter((product) =>
    product.name.toLocaleLowerCase().includes(productSearch.trim().toLocaleLowerCase()),
  );

  function selectedValues(event: React.ChangeEvent<HTMLSelectElement>): string[] {
    return Array.from(event.currentTarget.selectedOptions, (option) => option.value);
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
      categoryIds,
      productIds,
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="promotion-categories" className="block text-sm font-medium text-brown">
              الأقسام المستهدفة
            </label>
            <select
              id="promotion-categories"
              multiple
              size={5}
              value={categoryIds}
              onChange={(event) => setCategoryIds(selectedValues(event))}
              className="w-full rounded-lg border border-border bg-white p-2 text-sm text-brown focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            >
              {options.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted">يمكن دمج الأقسام مع المنتجات في العرض نفسه.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="promotion-product-search" className="block text-sm font-medium text-brown">
              المنتجات المستهدفة
            </label>
            <Input
              id="promotion-product-search"
              aria-label="بحث المنتجات"
              placeholder="ابحث عن منتج"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
            />
            <select
              id="promotion-products"
              multiple
              size={5}
              value={productIds}
              onChange={(event) => setProductIds(selectedValues(event))}
              className="w-full rounded-lg border border-border bg-white p-2 text-sm text-brown focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            >
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted">اترك القائمتين فارغتين لتطبيق العرض على الجميع.</p>
          </div>
        </div>
      </form>
    </Modal>
  );
}