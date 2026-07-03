"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import PrintInvoiceButton from "@/components/ui/PrintInvoiceButton";
import SaleWhatsAppButton from "@/components/whatsapp/SaleWhatsAppButton";
import { getSale } from "@/lib/actions/sales";
import { getStoreSettings } from "@/lib/actions/settings";
import { STORE_NAME_AR } from "@/lib/constants";
import {
  formatCurrency,
  formatDateTime,
  getPaymentMethodLabel,
} from "@/lib/utils";
import { useEffect, useState } from "react";

const statusLabels: Record<string, string> = {
  COMPLETED: "مكتملة",
  PENDING: "قيد الانتظار",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
  PARTIALLY_REFUNDED: "جزئي",
};

type SaleItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
  variant: {
    id: string;
    size: string;
    color: string;
    product: { name: string; nameAr: string | null };
  };
};

type ReturnItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant: {
    product: { name: string; nameAr: string | null };
    size: string;
    color: string;
  };
};

type SaleReturn = {
  id: string;
  returnNumber: string;
  refundAmount: number;
  status: string;
  reason: string | null;
  createdAt: Date;
  items: ReturnItem[];
};

type SaleData = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  notes: string | null;
  createdAt: Date;
  paymentMethod: string;
  customer: { name: string; phone: string | null } | null;
  user: { name: string };
  items: SaleItem[];
  returns: SaleReturn[];
};

interface SaleDetailsModalProps {
  saleId: string | null;
  onClose: () => void;
}

export default function SaleDetailsModal({
  saleId,
  onClose,
}: SaleDetailsModalProps) {
  const [sale, setSale] = useState<SaleData | null>(null);
  const [settings, setSettings] = useState<{
    currency_symbol?: string;
    store_name_ar?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!saleId) {
      setSale(null);
      return;
    }

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [saleData, storeSettings] = await Promise.all([
          getSale(saleId!),
          getStoreSettings(),
        ]);
        setSale(saleData);
        setSettings(storeSettings);
      } catch {
        setError("خطأ في تحميل بيانات الفاتورة");
      }
      setLoading(false);
    }

    load();
  }, [saleId]);

  const isOpen = Boolean(saleId);

  if (!isOpen) return null;

  const itemsText = sale
    ? sale.items
        .map(
          (item) =>
            `• ${item.variant.product.nameAr || item.variant.product.name} (${item.variant.size}/${item.variant.color}) × ${item.quantity}`
        )
        .join("\n")
    : "";

  const returnedQtyByVariant = new Map<string, number>();
  if (sale) {
    for (const ret of sale.returns) {
      if (ret.status !== "APPROVED") continue;
      for (const ri of ret.items) {
        const existing = returnedQtyByVariant.get(ri.variant.product.name + ri.variant.size + ri.variant.color) ?? 0;
        returnedQtyByVariant.set(ri.variant.product.name + ri.variant.size + ri.variant.color, existing + ri.quantity);
      }
    }
  }

  const hasReturns = sale?.returns.some((r) => r.status === "APPROVED") ?? false;
  const totalRefunded =
    sale?.returns
      .filter((r) => r.status === "APPROVED")
      .reduce((sum, r) => sum + r.refundAmount, 0) ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`فاتورة ${sale?.invoiceNumber || ""}`} size="xl">
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 rounded bg-brown/5" />
          <div className="h-4 rounded bg-brown/5" />
          <div className="h-4 rounded bg-brown/5" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && !error && sale && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <Badge status={sale.status}>
              {statusLabels[sale.status] || sale.status}
            </Badge>
            <div className="flex items-center gap-2">
              {sale.customer?.phone && (
                <SaleWhatsAppButton
                  customerName={sale.customer.name}
                  customerPhone={sale.customer.phone}
                  invoiceNumber={sale.invoiceNumber}
                  totalAmount={sale.totalAmount}
                  currencySymbol={settings?.currency_symbol || "ج.م"}
                  storeNameAr={settings?.store_name_ar || "بيت ورد"}
                  items={itemsText}
                />
              )}
              <PrintInvoiceButton invoiceId={`invoice-${sale.id}`} />
            </div>
          </div>

          <Card id={`invoice-${sale.id}`} className="print:shadow-none print:border-none">
            <CardContent className="pt-6">
              <div className="text-center border-b border-border pb-6 mb-6">
                <h2 className="text-xl font-bold text-brown">{STORE_NAME_AR}</h2>
                <p className="text-sm text-muted mt-1">
                  فاتورة بيع — {sale.invoiceNumber}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-muted">العميل</p>
                  <p className="font-medium">
                    {sale.customer?.name || "عميل نقدي"}
                  </p>
                  {sale.customer?.phone && (
                    <p dir="ltr" className="text-muted">
                      {sale.customer.phone}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-muted">الكاشير</p>
                  <p className="font-medium">{sale.user.name}</p>
                </div>
                <div>
                  <p className="text-muted">طريقة الدفع</p>
                  <p className="font-medium">
                    {getPaymentMethodLabel(sale.paymentMethod)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">التاريخ</p>
                  <p className="font-medium">{formatDateTime(sale.createdAt)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>المقاس/اللون</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الخصم</TableHead>
                    <TableHead>الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.variant.product.nameAr ||
                          item.variant.product.name}
                      </TableCell>
                      <TableCell>
                        {item.variant.size} / {item.variant.color}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell>
                        {item.discountAmount > 0
                          ? formatCurrency(item.discountAmount)
                          : "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 border-t border-border pt-4 space-y-2 text-sm max-w-xs ms-auto">
                <div className="flex justify-between">
                  <span className="text-muted">المجموع الفرعي</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discountAmount > 0 && (
                  <div className="flex justify-between text-danger">
                    <span>الخصم</span>
                    <span>- {formatCurrency(sale.discountAmount)}</span>
                  </div>
                )}
                {sale.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">الضريبة</span>
                    <span>{formatCurrency(sale.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-brown pt-2 border-t">
                  <span>الإجمالي</span>
                  <span className="text-gold">
                    {formatCurrency(sale.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">المدفوع</span>
                  <span>{formatCurrency(sale.paidAmount)}</span>
                </div>
                {sale.changeAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">الباقي</span>
                    <span>{formatCurrency(sale.changeAmount)}</span>
                  </div>
                )}
                {hasReturns && (
                  <div className="flex justify-between text-red-600 pt-2 border-t border-red-200">
                    <span>إجمالي المسترد</span>
                    <span className="font-semibold">- {formatCurrency(totalRefunded)}</span>
                  </div>
                )}
              </div>

              {hasReturns && (
                <div className="mt-6 border-t border-border pt-6">
                  <h3 className="text-lg font-semibold text-brown mb-4">
                    سجل المرتجعات
                  </h3>
                  <div className="space-y-4">
                    {sale.returns
                      .filter((r) => r.status === "APPROVED")
                      .map((ret) => (
                        <div
                          key={ret.id}
                          className="rounded-lg border border-red-200 bg-red-50/50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div>
                              <p className="font-medium text-brown">
                                رقم المرتجع: {ret.returnNumber}
                              </p>
                              <p className="text-xs text-muted">
                                {formatDateTime(ret.createdAt)}
                              </p>
                            </div>
                            <span className="text-red-700 font-semibold">
                              - {formatCurrency(ret.refundAmount)}
                            </span>
                          </div>
                          {ret.reason && (
                            <p className="text-xs text-muted mb-2">
                              السبب: {ret.reason}
                            </p>
                          )}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-red-200 text-muted">
                                  <th className="text-start py-1">المنتج</th>
                                  <th className="text-start py-1">المقاس/اللون</th>
                                  <th className="text-start py-1">الكمية</th>
                                  <th className="text-start py-1">السعر</th>
                                  <th className="text-start py-1">الإجمالي</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ret.items.map((ri) => (
                                  <tr key={ri.id} className="border-b border-red-100 last:border-0">
                                    <td className="py-1">
                                      {ri.variant.product.nameAr ||
                                        ri.variant.product.name}
                                    </td>
                                    <td className="py-1">
                                      {ri.variant.size} / {ri.variant.color}
                                    </td>
                                    <td className="py-1 text-red-600 font-medium">
                                      {ri.quantity}
                                    </td>
                                    <td className="py-1">
                                      {formatCurrency(ri.unitPrice)}
                                    </td>
                                    <td className="py-1 font-medium">
                                      {formatCurrency(ri.totalPrice)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {sale.notes && (
                <p className="mt-4 text-sm text-muted border-t pt-4">
                  ملاحظات: {sale.notes}
                </p>
              )}

              <div className="mt-6 flex justify-end print:hidden">
                <Button variant="ghost" onClick={onClose}>
                  إغلاق
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Modal>
  );
}
