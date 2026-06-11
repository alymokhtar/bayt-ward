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
import { getSale } from "@/lib/actions/sales";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  totalPrice: number;
  variant: {
    size: string;
    color: string;
    product: { name: string; nameAr: string | null };
  };
};

type SaleData = {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  items: SaleItem[];
};

interface ReturnsClientProps {
  returns: ReturnRecord[];
}

export default function ReturnsClient({ returns: initial }: ReturnsClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [sale, setSale] = useState<SaleData | null>(null);
  const [selectedItems, setSelectedItems] = useState<
    Record<string, number>
  >({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadSale() {
    setError("");
    setSale(null);
    if (!invoiceSearch.trim()) return;

    try {
      const sales = await import("@/lib/actions/sales").then((m) =>
        m.getSales({ search: invoiceSearch.trim(), limit: 1 })
      );
      if (sales.length === 0) {
        setError("لم يتم العثور على الفاتورة");
        return;
      }
      const fullSale = await getSale(sales[0].id);
      if (fullSale.status !== "COMPLETED" && fullSale.status !== "REFUNDED") {
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
      return { ...prev, [variantId]: 1 };
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
          const qty = selectedItems[item.variantId];
          return {
            variantId: item.variantId,
            quantity: qty,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * qty,
          };
        })
    : [];

  const refundAmount = returnItems.reduce((s, i) => s + i.totalPrice, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sale || returnItems.length === 0) {
      setError("اختر منتجات للإرجاع");
      return;
    }

    setLoading(true);
    const result = await createReturn({
      saleId: sale.id,
      customerId: sale.customerId || undefined,
      items: returnItems,
      totalAmount: refundAmount,
      refundAmount,
      reason: reason || undefined,
      notes: notes || undefined,
    });
    setLoading(false);

    if (result.success) {
      setModalOpen(false);
      setSale(null);
      setInvoiceSearch("");
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setModalOpen(true); setError(""); setSale(null); }}>
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
              <TableCell className="font-medium">{r.returnNumber}</TableCell>
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
        title="معالجة مرتجع"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
              {sale.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <input
                    type="checkbox"
                    checked={!!selectedItems[item.variantId]}
                    onChange={() =>
                      toggleItem(item.variantId, item.quantity)
                    }
                    className="rounded"
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">
                      {item.variant.product.nameAr ||
                        item.variant.product.name}
                    </p>
                    <p className="text-muted">
                      {item.variant.size}/{item.variant.color} — الكمية المباعة:{" "}
                      {item.quantity}
                    </p>
                  </div>
                  {selectedItems[item.variantId] && (
                    <Input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={selectedItems[item.variantId]}
                      onChange={(e) =>
                        updateQty(
                          item.variantId,
                          parseInt(e.target.value) || 1,
                          item.quantity
                        )
                      }
                      className="w-20"
                    />
                  )}
                  <span className="text-sm text-gold">
                    {formatCurrency(item.unitPrice)}
                  </span>
                </div>
              ))}
              {refundAmount > 0 && (
                <p className="font-semibold text-brown">
                  مبلغ الاسترداد: {formatCurrency(refundAmount)}
                </p>
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

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={loading} disabled={!sale}>
              تأكيد المرتجع
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
