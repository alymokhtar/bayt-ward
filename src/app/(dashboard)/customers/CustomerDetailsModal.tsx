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
import CustomerWhatsAppButton from "@/components/whatsapp/CustomerWhatsAppButton";
import { getCustomer } from "@/lib/actions/customers";
import {
  formatCurrency,
  formatDateTime,
  getSaleStatusLabel,
} from "@/lib/utils";
import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type CustomerDetails = Awaited<ReturnType<typeof getCustomer>>;

interface CustomerDetailsModalProps {
  customerId: string | null;
  onClose: () => void;
}

export default function CustomerDetailsModal({
  customerId,
  onClose,
}: CustomerDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<CustomerDetails | null>(null);

  useEffect(() => {
    if (!customerId) {
      setData(null);
      setError("");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getCustomer(customerId!);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("تعذر تحميل تفاصيل العميل");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return (
    <Modal
      isOpen={!!customerId}
      onClose={onClose}
      title={data?.name || "تفاصيل العميل"}
      description={data ? "بيانات العميل وسجل المشتريات" : undefined}
      size="xl"
    >
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-brown/5" />
            ))}
          </div>
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
          <div className="flex justify-end">
            <CustomerWhatsAppButton
              customerName={data.name}
              customerPhone={data.phone}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-cream/50 p-4 text-center">
              <p className="text-xs text-muted">إجمالي الإنفاق</p>
              <p className="mt-1 text-lg font-bold text-gold">
                {formatCurrency(data.totalSpent)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-cream/50 p-4 text-center">
              <p className="text-xs text-muted">عدد الزيارات</p>
              <p className="mt-1 text-lg font-bold text-brown">
                {data.visitCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-cream/50 p-4 text-center">
              <p className="text-xs text-muted">عدد المبيعات</p>
              <p className="mt-1 text-lg font-bold text-brown">
                {data.sales.length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-3 text-sm">
            <p className="font-medium text-brown">معلومات الاتصال</p>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted" />
              <span dir="ltr">{data.phone}</span>
            </div>
            {data.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted" />
                <span dir="ltr">{data.email}</span>
              </div>
            )}
            {data.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted" />
                <span>{data.address}</span>
              </div>
            )}
            {data.notes && (
              <p className="text-muted border-t border-border pt-3">
                {data.notes}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-brown">سجل المشتريات</p>
            {data.sales.length === 0 ? (
              <p className="rounded-xl border border-border py-8 text-center text-sm text-muted">
                لا توجد مشتريات بعد
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>المنتجات</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <Link
                          href={`/sales/${sale.id}`}
                          className="font-medium text-gold hover:underline"
                        >
                          {sale.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{sale._count.items}</TableCell>
                      <TableCell>{formatCurrency(sale.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge status={sale.status}>
                          {getSaleStatusLabel(sale.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted">
                        {formatDateTime(sale.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
