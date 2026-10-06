"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  adjustStock,
  findInventoryVariantByCode,
} from "@/lib/actions/inventory";
import { formatCurrency } from "@/lib/utils";
import { Barcode, PackagePlus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import ProductInventoryModal from "@/app/(dashboard)/inventory/ProductInventoryModal";

type Variant = {
  id: string;
  productId: string;
  sku: string;
  barcode?: string | null;
  size: string;
  color: string;
  stockQuantity: number;
  minStockLevel: number;
  costPrice: number;
  sellingPrice: number;
  product: {
    name: string;
    nameAr: string | null;
    category: { name: string; nameAr: string | null };
  };
};

interface InventoryVariantsClientProps {
  variants: Variant[];
}

export default function InventoryVariantsClient({
  variants,
}: InventoryVariantsClientProps) {
  const router = useRouter();
  const [adjustModal, setAdjustModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState("");
  const [adjustType, setAdjustType] = useState("ADJUSTMENT");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [quickScanCode, setQuickScanCode] = useState("");
  const [quickScanMessage, setQuickScanMessage] = useState("");
  const [quickScanError, setQuickScanError] = useState(false);
  const [quickScanLoading, setQuickScanLoading] = useState(false);
  const quickScanRef = useRef<HTMLInputElement>(null);

  function focusQuickScan() {
    window.setTimeout(() => quickScanRef.current?.focus(), 0);
  }

  function closeAdjustModal() {
    setAdjustModal(false);
    focusQuickScan();
  }

  function openAdjust(variant: Variant) {
    setSelectedVariant(variant);
    setQuantity("");
    setNotes("");
    setError("");
    setAdjustModal(true);
  }

  async function handleQuickScan() {
    const code = quickScanCode.trim();
    if (!code || quickScanLoading) return;

    setQuickScanLoading(true);
    setQuickScanMessage("");
    setQuickScanError(false);
    try {
      const result = await findInventoryVariantByCode(code);
      if (!result.success) {
        setQuickScanError(true);
        setQuickScanMessage(result.error);
        return;
      }

      if (result.data.length === 1) {
        setQuickScanCode("");
        openAdjust(result.data[0]);
      } else if (result.data.length > 1) {
        setQuickScanError(true);
        setQuickScanMessage("الرمز يطابق أكثر من متغير؛ راجع SKU أو الباركود.");
      } else {
        setQuickScanError(true);
        setQuickScanMessage("لم يتم العثور على منتج بهذا الباركود أو SKU.");
      }
    } catch {
      setQuickScanError(true);
      setQuickScanMessage("تعذر البحث عن المنتج. حاول مرة أخرى.");
    } finally {
      setQuickScanLoading(false);
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVariant) return;

    const qty = parseInt(quantity);
    if (!qty || qty === 0) {
      setError("أدخل كمية صالحة");
      return;
    }

    setLoading(true);
    const result = await adjustStock({
      variantId: selectedVariant.id,
      quantity: qty,
      type: adjustType as "ADJUSTMENT" | "DAMAGE" | "TRANSFER",
      notes: notes || undefined,
    });
    setLoading(false);

    if (result.success) {
      closeAdjustModal();
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-cream-dark/30 p-4">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="inventory-quick-scan" className="mb-1 block text-sm font-medium text-brown">
            جرد سريع بالباركود أو SKU
          </label>
          <div className="relative">
            <Barcode className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              ref={quickScanRef}
              id="inventory-quick-scan"
              value={quickScanCode}
              onChange={(event) => setQuickScanCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleQuickScan();
                }
              }}
              placeholder="امسح الباركود ثم اضغط Enter"
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-border bg-white ps-10 pe-4 text-sm"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleQuickScan()}
          loading={quickScanLoading}
          disabled={!quickScanCode.trim()}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          جرد سريع
        </Button>
        {quickScanMessage && (
          <p
            role={quickScanError ? "alert" : "status"}
            className={`basis-full text-sm ${quickScanError ? "text-danger" : "text-success"}`}
          >
            {quickScanMessage}
          </p>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المنتج</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>المقاس/اللون</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>الحد الأدنى</TableHead>
            <TableHead>قيمة التكلفة</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((v) => (
            <TableRow key={v.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => setDetailProductId(v.productId)}
                  className="text-start font-medium text-brown hover:text-gold hover:underline transition-colors"
                >
                  {v.product.nameAr || v.product.name}
                </button>
                <p className="text-xs text-muted">
                  {v.product.category.nameAr || v.product.category.name}
                </p>
              </TableCell>
              <TableCell dir="ltr" className="text-start">
                {v.sku}
              </TableCell>
              <TableCell>
                {v.size} / {v.color}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    v.stockQuantity === 0
                      ? "danger"
                      : v.stockQuantity <= v.minStockLevel
                        ? "warning"
                        : "success"
                  }
                >
                  {v.stockQuantity}
                </Badge>
              </TableCell>
              <TableCell>{v.minStockLevel}</TableCell>
              <TableCell>
                {formatCurrency(v.costPrice * v.stockQuantity)}
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => openAdjust(v)}>
                  <PackagePlus className="h-4 w-4" />
                  تعديل
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={adjustModal}
        onClose={closeAdjustModal}
        title="تعديل المخزون"
        description={
          selectedVariant
            ? `${selectedVariant.product.nameAr || selectedVariant.product.name} — ${selectedVariant.size} / ${selectedVariant.color} — SKU: ${selectedVariant.sku} — الكمية الحالية: ${selectedVariant.stockQuantity}`
            : undefined
        }
        footer={
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={closeAdjustModal}>
              إلغاء
            </Button>
            <Button type="submit" form="modal-form-inventory-variant-adjust" loading={loading}>
              حفظ
            </Button>
          </div>
        }
      >
        <form id="modal-form-inventory-variant-adjust" onSubmit={handleAdjust} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Select
            label="نوع الحركة"
            options={[
              { value: "ADJUSTMENT", label: "تعديل" },
              { value: "DAMAGE", label: "تلف" },
              { value: "TRANSFER", label: "نقل" },
            ]}
            value={adjustType}
            onChange={(e) => setAdjustType(e.target.value)}
          />
          <Input
            label="الكمية (+ للإضافة، - للخصم)"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            hint="مثال: 10 لإضافة، -5 لخصم"
          />
          <Input
            label="ملاحظات"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </form>
      </Modal>

      <ProductInventoryModal
        productId={detailProductId}
        onClose={() => setDetailProductId(null)}
      />
    </>
  );
}
