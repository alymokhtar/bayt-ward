"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getPurchase } from "@/lib/actions/purchases";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useEffect, useState } from "react";

type PurchaseDetails = Awaited<ReturnType<typeof getPurchase>>;

const statusLabels: Record<string, string> = {
  PENDING: "قيد الانتظار",
  RECEIVED: "مستلم",
  CANCELLED: "ملغى",
};

interface PurchaseDetailsModalProps {
  purchaseId: string | null;
  onClose: () => void;
}

export default function PurchaseDetailsModal({
  purchaseId,
  onClose,
}: PurchaseDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PurchaseDetails | null>(null);

  useEffect(() => {
    if (!purchaseId) {
      setData(null);
      setError("");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getPurchase(purchaseId!);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("تعذر تحميل تفاصيل أمر الشراء");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [purchaseId]);

  return (
    <Modal
      isOpen={!!purchaseId}
      onClose={onClose}
      title={data?.invoiceNumber || "تفاصيل أمر الشراء"}
      description={data ? formatDateTime(data.createdAt) : undefined}
      size="xl"
    >
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-1/3 rounded bg-brown/10" />
          <div className="h-24 rounded-xl bg-brown/5" />
          <div className="h-40 rounded-xl bg-brown/5" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge status={data.status}>
              {statusLabels[data.status] || data.status}
            </Badge>
            <span className="text-sm text-muted">بواسطة {data.user.name}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-cream/50 p-4">
              <p className="text-xs text-muted">المورد</p>
              <p className="mt-1 text-sm font-medium text-brown">
                {data.supplier.name}
              </p>
              {data.supplier.phone && (
                <p className="text-xs text-muted" dir="ltr">
                  {data.supplier.phone}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-cream/50 p-4">
              <p className="text-xs text-muted">تاريخ الاستلام</p>
              <p className="mt-1 text-sm font-medium text-brown">
                {data.receivedAt
                  ? formatDateTime(data.receivedAt)
                  : "لم يُستلم بعد"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-cream/50 p-4">
              <p className="text-xs text-muted">المجموع الفرعي</p>
              <p className="mt-1 text-sm font-medium text-brown">
                {formatCurrency(data.subtotal)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-cream/50 p-4">
              <p className="text-xs text-muted">الإجمالي</p>
              <p className="mt-1 text-sm font-semibold text-gold">
                {formatCurrency(data.totalAmount)}
              </p>
            </div>
          </div>

          {data.notes && (
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted">ملاحظات</p>
              <p className="mt-1 text-sm text-brown">{data.notes}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-brown">المنتجات</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>المقاس / اللون</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>التكلفة</TableHead>
                  <TableHead>الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.variant.product.nameAr || item.variant.product.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted">
                      {item.variant.size} / {item.variant.color}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                    <TableCell className="font-medium text-gold">
                      {formatCurrency(item.totalCost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
