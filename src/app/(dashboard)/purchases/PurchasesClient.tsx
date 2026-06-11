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
import { searchVariants } from "@/lib/actions/products";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PackageCheck, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VariantResult[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotal = items.reduce(
    (sum, i) => sum + i.unitCost * i.quantity,
    0
  );

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setResults(await searchVariants(q));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

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
      setItems([]);
      setSupplierId("");
      setNotes("");
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
        <Button onClick={() => { setModalOpen(true); setError(""); }}>
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
              <TableCell className="font-medium">{p.invoiceNumber}</TableCell>
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

          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full h-10 rounded-lg border border-border ps-10 pe-4 text-sm"
            />
          </div>

          {results.length > 0 && (
            <ul className="border border-border rounded-lg divide-y max-h-40 overflow-y-auto">
              {results.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => addItem(v)}
                    className="w-full px-3 py-2 text-sm text-start hover:bg-gold/5"
                  >
                    {v.product.nameAr || v.product.name} — {v.sku}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.variant.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3"
                >
                  <span className="flex-1 text-sm font-medium">
                    {item.variant.product.nameAr || item.variant.product.name}
                  </span>
                  <Input
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
                    className="w-20"
                  />
                  <Input
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
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.variant.id)}
                  >
                    حذف
                  </Button>
                </div>
              ))}
              <p className="text-sm font-semibold text-brown">
                الإجمالي: {formatCurrency(subtotal)}
              </p>
            </div>
          )}

          <Input
            label="ملاحظات"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={loading}>
              إنشاء الأمر
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
