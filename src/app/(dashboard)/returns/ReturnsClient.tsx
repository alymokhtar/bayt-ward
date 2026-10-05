"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { createReturn } from "@/lib/actions/returns";
import { createExchange } from "@/lib/actions/exchanges";
import ReturnDetailsModal from "@/app/(dashboard)/returns/ReturnDetailsModal";
import { getSale } from "@/lib/actions/sales";
import { searchVariants } from "@/lib/actions/products";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { calculateReturnRefundAmount } from "@/lib/return-pricing";
import { calculateCartDiscounts, type Promotion } from "@/lib/promotions";
import { allocateInvoiceDiscount } from "@/lib/sale-pricing";
import {
  applyEqualProductExchangePricing,
  calculateExchangeSettlementBalance,
} from "@/lib/exchange-pricing";

type VariantResult = Awaited<ReturnType<typeof searchVariants>>[number];

type ReturnRecord = {
  id: string;
  returnNumber: string;
  totalAmount: number;
  refundAmount: number;
  status: string;
  createdAt: Date;
  sale: { invoiceNumber: string };
  customer: { name: string } | null;
  user: { name: string };
  _count: { items: number };
};

type SaleItem = {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
  variant: {
    id: string;
    size: string;
    color: string;
    product: { id: string; name: string; nameAr: string | null };
  };
};

type PreviousReturnItem = {
  saleItemId: string | null;
  quantity: number;
  totalPrice: number;
  variant: { id: string };
};

type SaleData = {
  id: string;
  invoiceNumber: string;
  items: SaleItem[];
  returns: Array<{
    status: string;
    items: PreviousReturnItem[];
  }>;
};

interface ReturnsClientProps {
  returns: ReturnRecord[];
  activePromotions: Promotion[];
}

export default function ReturnsClient({
  returns: initial,
  activePromotions,
}: ReturnsClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [sale, setSale] = useState<SaleData | null>(null);
  const [selectedItems, setSelectedItems] = useState<
    Record<string, number>
  >({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [refundMethod, setRefundMethod] = useState<"CASH" | "INSTAPAY" | "WALLET">("CASH");
  const [isExchange, setIsExchange] = useState(false);
  const [replacementSearch, setReplacementSearch] = useState("");
  const [replacementVariants, setReplacementVariants] = useState<VariantResult[]>([]);
  const [replacementItems, setReplacementItems] = useState<Record<string, number>>({});
  const [settlementMethod, setSettlementMethod] = useState<"CASH" | "CARD" | "WALLET">("CASH");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);

  async function loadSale() {
    setError("");
    setSale(null);
    if (!invoiceSearch.trim()) return;

    try {
      const salesResult = await import("@/lib/actions/sales").then((m) =>
        m.getSales({ search: invoiceSearch.trim(), pageSize: 1 })
      );
      if (salesResult.items.length === 0) {
        setError("لم يتم العثور على الفاتورة");
        return;
      }
      const fullSale = await getSale(salesResult.items[0].id);
      if (fullSale.status !== "COMPLETED" && fullSale.status !== "REFUNDED" && fullSale.status !== "PARTIALLY_REFUNDED") {
        setError("لا يمكن إرجاع منتجات من هذه الفاتورة");
        return;
      }
      setSale(fullSale);
      setSelectedItems({});
    } catch {
      setError("خطأ في تحميل الفاتورة");
    }
  }

  function toggleItem(variantId: string, maxQty: number) {
    setSelectedItems((prev) => {
      if (prev[variantId]) {
        const next = { ...prev };
        delete next[variantId];
        return next;
      }
      return { ...prev, [variantId]: Math.min(1, maxQty) };
    });
  }

  function updateQty(variantId: string, qty: number, max: number) {
    setSelectedItems((prev) => ({
      ...prev,
      [variantId]: Math.min(Math.max(1, qty), max),
    }));
  }

  const returnItems = sale
    ? sale.items
        .filter((item) => selectedItems[item.variantId])
        .map((item) => {
          return {
            variantId: item.variantId,
            quantity: selectedItems[item.variantId],
          };
        })
    : [];

  const pricedReturnItems = sale
    ? sale.items.flatMap((item) => {
        const quantity = selectedItems[item.variantId] ?? 0;
        if (quantity === 0) return [];

        const previousReturns = sale.returns
          .filter((returnRecord) => returnRecord.status === "APPROVED")
          .flatMap((returnRecord) => returnRecord.items)
          .filter((returnedItem) =>
            returnedItem.saleItemId === item.id ||
            (!returnedItem.saleItemId && returnedItem.variant.id === item.variantId)
          );

        const calculation = calculateReturnRefundAmount(
          item,
          quantity,
          previousReturns.reduce((total, returnedItem) => total + returnedItem.quantity, 0),
          previousReturns.reduce((total, returnedItem) => total + returnedItem.totalPrice, 0),
        );
        return [{
          productId: item.variant.product.id,
          variantId: item.variantId,
          quantity,
          refundAmount: calculation.refundAmount,
        }];
      })
    : [];
  const refundAmount = pricedReturnItems.reduce(
    (sum, item) => sum + item.refundAmount,
    0,
  );

  function getAvailableQuantity(item: SaleItem) {
    const returnedQuantity = sale?.returns
      .filter((returnRecord) => returnRecord.status === "APPROVED")
      .flatMap((returnRecord) => returnRecord.items)
      .filter((returnedItem) =>
        returnedItem.saleItemId === item.id ||
        (!returnedItem.saleItemId && returnedItem.variant.id === item.variantId)
      )
      .reduce((sum, returnedItem) => sum + returnedItem.quantity, 0) ?? 0;
    return Math.max(0, item.quantity - returnedQuantity);
  }

  const replacementCart = Object.entries(replacementItems).flatMap(([variantId, quantity]) => {
    const variant = replacementVariants.find((item) => item.id === variantId);
    return variant && quantity > 0 ? [{ variant, quantity }] : [];
  });
  const replacementPromotions = calculateCartDiscounts(
    replacementCart.map(({ variant, quantity }) => ({
      productId: variant.product.id,
      variantId: variant.id,
      categoryId: variant.product.categoryId,
      unitPrice: variant.sellingPrice,
      quantity,
      name: variant.product.nameAr || variant.product.name,
    })),
    activePromotions,
    { channel: "POS" },
  );
  const baseReplacementPricing = allocateInvoiceDiscount(
    replacementCart.map(({ variant, quantity }) => ({
      key: variant.id,
      unitPrice: variant.sellingPrice,
      quantity,
    })),
    replacementPromotions.discountAmount,
  );
  const replacementPricing = applyEqualProductExchangePricing(
    pricedReturnItems,
    baseReplacementPricing.lines.map((line) => {
      const cartItem = replacementCart.find(({ variant }) => variant.id === line.key);
      if (!cartItem) {
        throw new Error("تعذر العثور على منتج بديل لتسعيره");
      }
      return { ...line, productId: cartItem.variant.product.id };
    }),
  );
  const settlementBalance = calculateExchangeSettlementBalance(
    replacementPricing.totalAmount,
    refundAmount,
  );

  async function searchReplacementVariants() {
    if (!replacementSearch.trim()) {
      setReplacementVariants([]);
      return;
    }
    setError("");
    try {
      setReplacementVariants(await searchVariants(replacementSearch.trim()));
    } catch {
      setError("تعذر البحث عن المنتجات البديلة");
    }
  }

  function getMaxReplacementQuantity(variant: VariantResult) {
    const returnedQuantity = returnItems
      .filter((item) => item.variantId === variant.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    return variant.stockQuantity + returnedQuantity;
  }

  function addReplacementVariant(variant: VariantResult) {
    const maxQuantity = getMaxReplacementQuantity(variant);
    if (maxQuantity <= 0) return;
    setReplacementItems((previous) => ({
      ...previous,
      [variant.id]: Math.min(previous[variant.id] ?? 1, maxQuantity),
    }));
  }

  function updateReplacementQuantity(variant: VariantResult, quantity: number) {
    const maxQuantity = getMaxReplacementQuantity(variant);
    setReplacementItems((previous) => {
      if (maxQuantity <= 0) {
        const next = { ...previous };
        delete next[variant.id];
        return next;
      }
      return {
        ...previous,
        [variant.id]: Math.min(Math.max(1, quantity), maxQuantity),
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sale || returnItems.length === 0) {
      setError(isExchange ? "اختر المنتجات المرتجعة والبديلة" : "اختر منتجات للإرجاع");
      return;
    }
    if (isExchange && replacementCart.length === 0) {
      setError("اختر منتجًا بديلاً واحدًا على الأقل");
      return;
    }
    if (isExchange && replacementCart.some(
      ({ variant, quantity }) => quantity > getMaxReplacementQuantity(variant),
    )) {
      setError("الكمية البديلة تتجاوز المخزون المتاح بعد المرتجع");
      return;
    }
    if (isExchange && settlementBalance !== 0 && !settlementMethod) {
      setError("اختر طريقة دفع أو رد الفرق");
      return;
    }

    setLoading(true);
    const result = isExchange
      ? await createExchange({
          originalSaleId: sale.id,
          returnItems,
          replacementItems: replacementCart.map(({ variant, quantity }) => ({
            variantId: variant.id,
            quantity,
          })),
          settlementMethod: settlementBalance === 0 ? undefined : settlementMethod,
          expectedSettlementBalance: settlementBalance,
          reason: reason || undefined,
          notes: notes || undefined,
        })
      : await createReturn({
          saleId: sale.id,
          items: returnItems,
          refundMethod,
          reason: reason || undefined,
          notes: notes || undefined,
        });
    setLoading(false);

    if (result.success) {
      if (isExchange && result.data && "settlementBalance" in result.data) {
        setSuccess(
          result.data.settlementBalance > 0
            ? `تم الاستبدال وتحصيل ${formatCurrency(result.data.settlementBalance)}`
            : result.data.settlementBalance < 0
              ? `تم الاستبدال ورد ${formatCurrency(Math.abs(result.data.settlementBalance))}`
              : "تم الاستبدال دون فرق مالي",
        );
      } else {
        setSuccess("تم تسجيل المرتجع بنجاح");
      }
      setModalOpen(false);
      setSale(null);
      setInvoiceSearch("");
      setIsExchange(false);
      setReplacementItems({});
      setReplacementVariants([]);
      setSelectedItems({});
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  return (
    <>
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}
      <div className="flex justify-end mb-4">
        <Button onClick={() => {
          setModalOpen(true);
          setError("");
          setSale(null);
          setSuccess("");
          setIsExchange(false);
          setReplacementItems({});
          setReplacementVariants([]);
        }}>
          <Plus className="h-4 w-4" />
          مرتجع جديد
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم المرتجع</TableHead>
            <TableHead>فاتورة البيع</TableHead>
            <TableHead>العميل</TableHead>
            <TableHead>المنتجات</TableHead>
            <TableHead>المسترد</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>التاريخ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => setSelectedReturnId(r.id)}
                  className="font-medium text-gold hover:underline"
                >
                  {r.returnNumber}
                </button>
              </TableCell>
              <TableCell>{r.sale.invoiceNumber}</TableCell>
              <TableCell>{r.customer?.name || "—"}</TableCell>
              <TableCell>{r._count.items}</TableCell>
              <TableCell className="text-gold font-medium">
                {formatCurrency(r.refundAmount)}
              </TableCell>
              <TableCell>
                <Badge status={r.status}>{r.status}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted">
                {formatDateTime(r.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isExchange ? "معالجة استبدال" : "معالجة مرتجع"}
        size="xl"
        footer={
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="submit"
              form="modal-form-return"
              loading={loading}
              disabled={
                !sale ||
                (isExchange &&
                  (replacementCart.length === 0 ||
                    replacementCart.some(
                      ({ variant, quantity }) => quantity > getMaxReplacementQuantity(variant),
                    )))
              }
            >
              {isExchange ? "تأكيد الاستبدال" : "تأكيد المرتجع"}
            </Button>
          </div>
        }
      >
        <form id="modal-form-return" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="رقم فاتورة البيع..."
                className="w-full h-10 rounded-lg border border-border ps-10 pe-4 text-sm"
              />
            </div>
            <Button type="button" variant="secondary" onClick={loadSale}>
              بحث
            </Button>
          </div>

          {sale && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-brown">
                فاتورة: {sale.invoiceNumber}
              </p>
              <label className="flex items-center gap-2 text-sm font-medium text-brown">
                <input
                  type="checkbox"
                  checked={isExchange}
                  onChange={(event) => {
                    setIsExchange(event.target.checked);
                    setError("");
                  }}
                />
                تنفيذ استبدال بمنتجات أخرى
              </label>
              {sale.items.map((item) => {
                const availableQuantity = getAvailableQuantity(item);
                return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <input
                    type="checkbox"
                    checked={!!selectedItems[item.variantId]}
                    onChange={() =>
                      toggleItem(item.variantId, availableQuantity)
                    }
                    disabled={availableQuantity === 0}
                    className="rounded"
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">
                      {item.variant.product.nameAr ||
                        item.variant.product.name}
                    </p>
                    <p className="text-muted">
                      {item.variant.size}/{item.variant.color} — الكمية المباعة:{" "}
                      {item.quantity} — المتاح للإرجاع: {availableQuantity}
                    </p>
                  </div>
                  {selectedItems[item.variantId] && (
                    <Input
                      type="number"
                      min={1}
                      max={availableQuantity}
                      value={selectedItems[item.variantId]}
                      onChange={(e) =>
                        updateQty(
                          item.variantId,
                          parseInt(e.target.value) || 1,
                          availableQuantity
                        )
                      }
                      className="w-20"
                    />
                  )}
                  <span className="text-sm text-gold">
                    {formatCurrency(item.unitPrice - item.discountAmount / item.quantity)}
                  </span>
                </div>
                );
              })}
              {refundAmount > 0 && (
                <p className="font-semibold text-brown">
                  {isExchange ? "صافي قيمة المنتجات المرتجعة" : "مبلغ الاسترداد"}:{" "}
                  {formatCurrency(refundAmount)}
                </p>
              )}
              {isExchange ? (
                <div className="space-y-3 rounded-lg border border-gold/30 bg-cream/40 p-3">
                  <div className="flex gap-2">
                    <Input
                      label="ابحث عن المنتج البديل"
                      value={replacementSearch}
                      onChange={(event) => setReplacementSearch(event.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-6"
                      onClick={searchReplacementVariants}
                    >
                      بحث
                    </Button>
                  </div>
                  {replacementVariants.map((variant) => {
                    const selected = replacementItems[variant.id] ?? 0;
                    const maxQuantity = getMaxReplacementQuantity(variant);
                    return (
                      <div key={variant.id} className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
                        <div className="flex-1 text-sm">
                          <p className="font-medium">
                            {variant.product.nameAr || variant.product.name}
                          </p>
                          <p className="text-muted">
                            {variant.size}/{variant.color} — المخزون المتاح: {maxQuantity}
                          </p>
                        </div>
                        <span className="text-sm text-gold">
                          {formatCurrency(variant.sellingPrice)}
                        </span>
                        {selected > 0 ? (
                          <>
                            <Input
                              type="number"
                              min={1}
                              max={maxQuantity}
                              value={selected}
                              onChange={(event) =>
                                updateReplacementQuantity(
                                  variant,
                                  parseInt(event.target.value, 10) || 1,
                                )
                              }
                              className="w-20"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                setReplacementItems((previous) => {
                                  const next = { ...previous };
                                  delete next[variant.id];
                                  return next;
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={maxQuantity <= 0}
                            onClick={() => addReplacementVariant(variant)}
                          >
                            إضافة
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {replacementCart.length > 0 && (
                    <>
                      <div className="space-y-1 border-t border-border pt-3 text-sm">
                        <p>
                          صافي المنتجات البديلة بعد العروض:{" "}
                          <strong>{formatCurrency(replacementPricing.totalAmount)}</strong>
                        </p>
                        <p>
                          صافي المرتجع: <strong>{formatCurrency(refundAmount)}</strong>
                        </p>
                        <p className="font-semibold text-brown">
                          {settlementBalance > 0
                            ? `المطلوب تحصيله: ${formatCurrency(settlementBalance)}`
                            : settlementBalance < 0
                              ? `المطلوب رده: ${formatCurrency(Math.abs(settlementBalance))}`
                              : "لا يوجد فرق مالي"}
                        </p>
                      </div>
                      {settlementBalance !== 0 && (
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-brown">
                            طريقة تسوية الفرق
                          </label>
                          <select
                            value={settlementMethod}
                            onChange={(event) =>
                              setSettlementMethod(event.target.value as "CASH" | "CARD" | "WALLET")
                            }
                            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                          >
                            <option value="CASH">كاش</option>
                            <option value="CARD">بطاقة</option>
                            <option value="WALLET">محفظة</option>
                          </select>
                        </div>
                      )}
                      <p className="text-xs text-muted">
                        يعاد التحقق من الأسعار والعروض والمخزون على الخادم قبل اعتماد العملية.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-brown block mb-1.5">
                    طريقة الاسترجاع
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as "CASH" | "INSTAPAY" | "WALLET")}
                    className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm"
                  >
                    <option value="CASH">كاش</option>
                    <option value="INSTAPAY">إنستاباي</option>
                    <option value="WALLET">محفظة</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <Input
            label="سبب الإرجاع"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Input
            label="ملاحظات"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

        </form>
      </Modal>

      <ReturnDetailsModal
        returnId={selectedReturnId}
        onClose={() => setSelectedReturnId(null)}
      />
    </>
  );
}
