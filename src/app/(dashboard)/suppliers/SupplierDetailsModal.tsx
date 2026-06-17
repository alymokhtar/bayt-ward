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
import { getSupplierDetails } from "@/lib/actions/suppliers";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useEffect, useState } from "react";

type SupplierDetails = Awaited<ReturnType<typeof getSupplierDetails>>;

const statusLabels: Record<string, string> = {
  PENDING: "قيد الانتظار",
  RECEIVED: "مستلم",
  CANCELLED: "ملغى",
};

interface SupplierDetailsModalProps {
  supplierId: string | null;
  onClose: () => void;
}

export default function SupplierDetailsModal({
  supplierId,
  onClose,
}: SupplierDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<SupplierDetails | null>(null);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!supplierId) {
      setData(null);
      setError("");
      setExpandedPurchaseId(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getSupplierDetails(supplierId!);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("تعذر تحميل تفاصيل المورد");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  return (
    <Modal
      isOpen={!!supplierId}
      onClose={onClose}
      title={data?.name || "تفاصيل المورد"}
      description={
        data
          ? `${data.isActive ? "مورد نشط" : "مورد غير نشط"} · منذ ${formatDateTime(data.createdAt)}`
          : undefined
      }
      size="xl"
    >
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-brown/5" />
            ))}
          </div>
          <div className="h-48 rounded-lg bg-brown/5" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="الهاتف" value={data.phone} dir="ltr" />
            <InfoRow label="البريد" value={data.email || "—"} dir="ltr" />
            <InfoRow
              label="العنوان"
              value={data.address || "—"}
              className="sm:col-span-2"
            />
            {data.notes && (
              <InfoRow
                label="ملاحظات"
                value={data.notes}
                className="sm:col-span-2"
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="عدد المشتريات"
              value={data.summary.purchaseCount.toString()}
            />
            <SummaryCard
              label="إجمالي المشتريات"
              value={formatCurrency(data.summary.totalPurchaseAmount)}
            />
            <SummaryCard
              label="آخر عملية شراء"
              value={
                data.summary.lastPurchaseAmount != null
                  ? formatCurrency(data.summary.lastPurchaseAmount)
                  : "—"
              }
              hint={
                data.summary.lastPurchaseAt
                  ? formatDateTime(data.summary.lastPurchaseAt)
                  : undefined
              }
            />
            <SummaryCard
              label="الحالة"
              value={data.isActive ? "نشط" : "غير نشط"}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-brown mb-3">
              سجل المشتريات ({data.purchases.length})
            </h3>

            {data.purchases.length === 0 ? (
              <p className="text-sm text-muted text-center py-6 rounded-lg border border-border">
                لا توجد مشتريات مسجلة لهذا المورد
              </p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {data.purchases.map((purchase) => {
                  const isExpanded = expandedPurchaseId === purchase.id;
                  return (
                    <div
                      key={purchase.id}
                      className="rounded-lg border border-border overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPurchaseId(
                            isExpanded ? null : purchase.id
                          )
                        }
                        className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-start hover:bg-gold/5 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-brown">
                            {purchase.invoiceNumber}
                          </p>
                          <p className="text-xs text-muted mt-0.5">
                            {formatDateTime(purchase.createdAt)} ·{" "}
                            {purchase._count.items} منتج ·{" "}
                            {purchase.user.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge status={purchase.status}>
                            {statusLabels[purchase.status] || purchase.status}
                          </Badge>
                          <span className="font-semibold text-gold">
                            {formatCurrency(purchase.totalAmount)}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border bg-cream/30 px-4 py-3">
                          {purchase.notes && (
                            <p className="text-xs text-muted mb-3">
                              ملاحظات: {purchase.notes}
                            </p>
                          )}
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>المنتج</TableHead>
                                  <TableHead>المقاس/اللون</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>الكمية</TableHead>
                                  <TableHead>التكلفة</TableHead>
                                  <TableHead>الإجمالي</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {purchase.items.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      {item.variant.product.nameAr ||
                                        item.variant.product.name}
                                    </TableCell>
                                    <TableCell>
                                      {item.variant.size} / {item.variant.color}
                                    </TableCell>
                                    <TableCell dir="ltr" className="text-start">
                                      {item.variant.sku}
                                    </TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>
                                      {formatCurrency(item.unitCost)}
                                    </TableCell>
                                    <TableCell>
                                      {formatCurrency(item.totalCost)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoRow({
  label,
  value,
  dir,
  className = "",
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border px-4 py-3 ${className}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-brown" dir={dir}>
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-cream/40 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-brown">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
