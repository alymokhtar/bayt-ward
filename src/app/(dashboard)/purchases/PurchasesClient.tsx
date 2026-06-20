"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { createPurchase, receivePurchase } from "@/lib/actions/purchases";
import PurchaseDetailsModal from "@/app/(dashboard)/purchases/PurchaseDetailsModal";
import { searchVariants } from "@/lib/actions/products";
import { scanVariantCode } from "@/lib/variant-scan-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PackageCheck, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Supplier = { id: string; name: string };
type Purchase = {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  supplier: { name: string };
  user: { name: string };
  _count: { items: number };
};
type VariantResult = Awaited<ReturnType<typeof searchVariants>>[number];

const statusLabels: Record<string, string> = {
  PENDING: "قيد الانتظار",
  RECEIVED: "مستلم",
  CANCELLED: "ملغى",
};

interface PurchasesClientProps {
  purchases: Purchase[];
  suppliers: Supplier[];
}

type PurchaseItem = {
  variant: VariantResult;
  quantity: number;
  unitCost: number;
};

export default function PurchasesClient({
  purchases: initial,
  suppliers,
}: PurchasesClientProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VariantResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const subtotal = items.reduce(
    (sum, i) => sum + i.unitCost * i.quantity,
    0
  );

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    setResults(await searchVariants(q));
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [modalOpen]);

  function focusAddProduct() {
    setQuery("");
    setResults([]);
    setError("");
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  function addItem(variant: VariantResult) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variant.id === variant.id);
      if (existing) {
        return prev.map((i) =>
          i.variant.id === variant.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        { variant, quantity: 1, unitCost: variant.costPrice },
      ];
    });
    setQuery("");
    setResults([]);
    setError("");
    searchRef.current?.focus();
  }

  async function resolveAndAdd(queryText: string) {
    const result = await scanVariantCode(queryText);

    if (result.status === "found") {
      addItem(result.variant);
      return;
    }

    if (result.status === "choose") {
      setResults(result.matches);
      setError("اختر المنتج من القائمة");
      return;
    }

    if (result.status === "ambiguous") {
      setResults(result.matches);
      setError("هذا الرمز مكرر بين أكثر من متغير — راجع المنتجات وصحّح الأكواد");
      return;
    }

    if (result.status === "not_found") {
      setError("لم يتم العثور على منتج بهذا الباركود أو الاسم");
      setResults([]);
    }
  }

  async function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    setError("");
    await resolveAndAdd(query);
  }

  function updateItem(
    variantId: string,
    field: "quantity" | "unitCost",
    value: number
  ) {
    setItems((prev) =>
      prev.map((i) =>
        i.variant.id === variantId ? { ...i, [field]: value } : i
      )
    );
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variant.id !== variantId));
  }

  function openModal() {
    setError("");
    setItems([]);
    setSupplierId("");
    setNotes("");
    setQuery("");
    setResults([]);
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || items.length === 0) {
      setError("اختر المورد وأضف منتجات");
      return;
    }

    setLoading(true);
    const result = await createPurchase({
      supplierId,
      items: items.map((i) => ({
        variantId: i.variant.id,
        quantity: i.quantity,
        unitCost: i.unitCost,
        totalCost: i.unitCost * i.quantity,
      })),
      subtotal,
      totalAmount: subtotal,
      notes: notes || undefined,
    });
    setLoading(false);

    if (result.success) {
      setModalOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  async function handleReceive(id: string) {
    if (!confirm("تأكيد استلام المشتريات وتحديث المخزون؟")) return;
    const result = await receivePurchase(id);
    if (result.success) router.refresh();
    else alert(result.error);
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openModal}>
          <Plus className="h-4 w-4" />
          أمر شراء جديد
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم الأمر</TableHead>
            <TableHead>المورد</TableHead>
            <TableHead>المنتجات</TableHead>
            <TableHead>الإجمالي</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => setSelectedPurchaseId(p.id)}
                  className="font-medium text-gold hover:underline"
                >
                  {p.invoiceNumber}
                </button>
              </TableCell>
              <TableCell>{p.supplier.name}</TableCell>
              <TableCell>{p._count.items}</TableCell>
              <TableCell className="text-gold font-medium">
                {formatCurrency(p.totalAmount)}
              </TableCell>
              <TableCell>
                <Badge status={p.status}>
                  {statusLabels[p.status] || p.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted">
                {formatDateTime(p.createdAt)}
              </TableCell>
              <TableCell>
                {p.status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReceive(p.id)}
                  >
                    <PackageCheck className="h-4 w-4" />
                    استلام
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="أمر شراء جديد"
        description="ابحث بالباركود أو اسم المنتج — يُضاف المخزون مباشرة عند الحفظ"
        size="xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <Select
            label="المورد"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            placeholder="اختر المورد"
            required
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-brown">
                إضافة منتج
              </label>
              {items.length > 0 && (
                <span className="text-xs text-muted">
                  {items.length} منتج في الأمر
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError("");
                }}
                onKeyDown={handleSearchKeyDown}
              placeholder="امسح الباركود أو ابحث بالـ SKU أو اسم المنتج ثم Enter..."
              className="w-full h-11 rounded-lg border border-border bg-white ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
              autoComplete="off"
              />
            </div>
          </div>

          {searching ? (
            <p className="text-sm text-muted text-center py-2">جاري البحث...</p>
          ) : results.length > 0 ? (
            <ul className="border border-border rounded-lg divide-y max-h-48 overflow-y-auto">
              {results.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => addItem(v)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-start hover:bg-gold/5"
                  >
                    <div>
                      <p className="font-medium text-brown">
                        {v.product.nameAr || v.product.name}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {v.sku}
                        {v.barcode ? ` · ${v.barcode}` : ""} · {v.size} · {v.color}
                      </p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-xs text-muted">متوفر: {v.stockQuantity}</p>
                      <p className="text-sm font-medium text-gold">
                        {formatCurrency(v.costPrice)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-brown">
                المنتجات المضافة ({items.length})
              </p>
              {items.map((item) => (
                <div
                  key={item.variant.id}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-brown">
                        {item.variant.product.nameAr || item.variant.product.name}
                      </p>
                      <p className="text-xs text-muted">
                        {item.variant.sku} · {item.variant.size} · {item.variant.color}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.variant.id)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Input
                      label="الكمية"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          item.variant.id,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                    />
                    <Input
                      label="سعر التكلفة"
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitCost}
                      onChange={(e) =>
                        updateItem(
                          item.variant.id,
                          "unitCost",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                    <div className="flex items-end">
                      <p className="text-sm font-medium text-brown pb-2.5">
                        الإجمالي:{" "}
                        {formatCurrency(item.unitCost * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={focusAddProduct}
              >
                <Plus className="h-4 w-4" />
                إضافة منتج آخر
              </Button>
              <p className="text-sm font-semibold text-brown pt-1">
                إجمالي الأمر: {formatCurrency(subtotal)}
              </p>
            </div>
          )}

          <Input
            label="ملاحظات"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={loading} disabled={items.length === 0}>
              حفظ وإضافة للمخزون
            </Button>
          </div>
        </form>
      </Modal>

      <PurchaseDetailsModal
        purchaseId={selectedPurchaseId}
        onClose={() => setSelectedPurchaseId(null)}
      />
    </>
  );
}
