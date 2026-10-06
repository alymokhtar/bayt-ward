"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { getSale } from "@/lib/actions/sales";
import { STORE_NAME_AR } from "@/lib/constants";
import { getSalePaymentSummary } from "@/lib/sales-payment-utils";
import { printReceipt } from "@/lib/print-receipt";
import {
  formatCurrency,
  formatDateTime,
  getPaymentDisplayLabel,
  getPaymentMethodLabel,
} from "@/lib/utils";
import { Printer } from "lucide-react";
import Link from "next/link";
import SaleWhatsAppButton from "@/components/whatsapp/SaleWhatsAppButton";
import { useState } from "react";

type SaleData = Awaited<ReturnType<typeof getSale>>;
type ExchangeItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant: {
    size: string;
    color: string;
    product: { name: string; nameAr: string | null };
  };
};

interface InvoiceDetailViewProps {
  sale: SaleData;
  settings?: {
    currency_symbol?: string;
    store_name_ar?: string;
  } | null;
}

const statusLabels: Record<string, string> = {
  COMPLETED: "مكتملة",
  PENDING: "قيد الانتظار",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
  PARTIALLY_REFUNDED: "جزئي",
};

export default function InvoiceDetailView({
  sale,
  settings,
}: InvoiceDetailViewProps) {
  const [printError, setPrintError] = useState("");
  const itemsText = sale.items
    .map(
      (item) =>
        `• ${item.variant.product.nameAr || item.variant.product.name} (${item.variant.size}/${item.variant.color}) × ${item.quantity}`,
    )
    .join("\n");
  const returnedQtyByVariant = new Map<string, number>();

  for (const ret of sale.returns) {
    if (ret.status !== "APPROVED") continue;
    for (const item of ret.items) {
      const returnedQuantity =
        returnedQtyByVariant.get(item.variant.id) ?? 0;
      returnedQtyByVariant.set(
        item.variant.id,
        returnedQuantity + item.quantity,
      );
    }
  }

  const approvedReturns = sale.returns.filter(
    (ret) => ret.status === "APPROVED",
  );
  const totalRefunded = approvedReturns.reduce(
    (sum, ret) => sum + ret.refundAmount,
    0,
  );
  const salePaymentSummary = getSalePaymentSummary({
    totalAmount: sale.totalAmount,
    fallbackPaidAmount: sale.paidAmount,
    tenderedAmount: sale.tenderedAmount ?? undefined,
    changeAmount: sale.changeAmount ?? undefined,
    paymentMethod: sale.paymentMethod,
    payments: sale.payments,
  });
  const historicalPaidAmount =
    sale.tenderedAmount ?? salePaymentSummary.paidAmount;
  const historicalRemaining =
    sale.changeAmount ?? salePaymentSummary.remainingAmount;
  const paymentSummaryText = sale.exchangeAsReplacement
    ? "تسوية استبدال"
    : salePaymentSummary.normalizedPayments.length > 1
      ? salePaymentSummary.normalizedPayments
          .map(
            (payment) =>
              `${getPaymentMethodLabel(payment.method)}: ${formatCurrency(payment.amount)}`,
          )
          .join(" • ")
      : getPaymentDisplayLabel(
          salePaymentSummary.paymentSummary,
          salePaymentSummary.normalizedPayments,
        );

  function handleThermalPrint() {
    setPrintError("");
    try {
      printReceipt({
        invoiceNumber: sale.invoiceNumber,
        channel: sale.channel,
        createdAt: sale.createdAt,
        storeNameAr: settings?.store_name_ar || STORE_NAME_AR,
        currencySymbol: settings?.currency_symbol || "ج.م",
        cashierName: sale.user.name,
        customerName: sale.customer?.name || undefined,
        customerPhone: sale.customer?.phone || undefined,
        paymentMethod: salePaymentSummary.paymentSummary,
        payments: salePaymentSummary.normalizedPayments,
        items: sale.items.map((item) => ({
          name: item.variant.product.nameAr || item.variant.product.name,
          size: item.variant.size,
          color: item.variant.color,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        subtotal: sale.subtotal,
        discountAmount: sale.discountAmount,
        totalAmount: sale.totalAmount,
        paidAmount: historicalPaidAmount,
        changeAmount: historicalRemaining,
        notes: sale.notes || undefined,
      });
    } catch (error) {
      console.error("Failed to print sale receipt:", error);
      setPrintError("تعذرت الطباعة الحرارية. يرجى المحاولة مرة أخرى.");
    }
  }

  return (
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
              storeNameAr={settings?.store_name_ar || STORE_NAME_AR}
              items={itemsText}
            />
          )}
          <Button variant="outline" onClick={handleThermalPrint}>
            <Printer className="h-4 w-4" />
            طباعة حرارية
          </Button>
        </div>
      </div>
      {printError && (
        <p role="status" className="text-sm text-danger print:hidden">
          {printError}
        </p>
      )}

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
              <p className="font-medium">{paymentSummaryText}</p>
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
                <TableHead>تم استرجاع</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الخصم</TableHead>
                <TableHead>الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item) => {
                const returnedQuantity =
                  returnedQtyByVariant.get(item.variant.id) ?? 0;

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.variant.product.nameAr || item.variant.product.name}
                    </TableCell>
                    <TableCell>
                      {item.variant.size} / {item.variant.color}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {returnedQuantity > 0 ? (
                        <span className="text-red-600 font-medium">
                          {returnedQuantity}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
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
                );
              })}
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
              <span>{formatCurrency(historicalPaidAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">الباقي</span>
              <span>{formatCurrency(historicalRemaining)}</span>
            </div>
            {approvedReturns.length > 0 && (
              <div className="flex justify-between text-red-600 pt-2 border-t border-red-200">
                <span>إجمالي المسترد</span>
                <span className="font-semibold">
                  - {formatCurrency(totalRefunded)}
                </span>
              </div>
            )}
          </div>

          {(sale.exchangesAsOriginal.length > 0 ||
            sale.exchangeAsReplacement) && (
            <div className="mt-6 border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-brown mb-4">
                سجل الاستبدال
              </h3>
              <div className="space-y-3">
                {sale.exchangesAsOriginal.map((exchange) => (
                  <div
                    key={exchange.id}
                    className="rounded-lg border border-gold/30 bg-cream/50 p-4"
                  >
                    <p className="font-medium text-brown">
                      {exchange.exchangeNumber} — فاتورة بديلة:{" "}
                      <Link
                        href={`/sales/${exchange.replacementSale.id}`}
                        className="text-gold hover:underline"
                      >
                        {exchange.replacementSale.invoiceNumber}
                      </Link>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatSettlement(exchange.settlementBalance)}
                    </p>
                    <ExchangeItems
                      returnedItems={exchange.return.items}
                      replacementItems={exchange.replacementSale.items}
                    />
                  </div>
                ))}
                {sale.exchangeAsReplacement && (
                  <div className="rounded-lg border border-gold/30 bg-cream/50 p-4">
                    <p className="font-medium text-brown">
                      {sale.exchangeAsReplacement.exchangeNumber} — الفاتورة
                      الأصلية:{" "}
                      <Link
                        href={`/sales/${sale.exchangeAsReplacement.originalSale.id}`}
                        className="text-gold hover:underline"
                      >
                        {sale.exchangeAsReplacement.originalSale.invoiceNumber}
                      </Link>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatSettlement(
                        sale.exchangeAsReplacement.settlementBalance,
                      )}
                    </p>
                    <ExchangeItems
                      returnedItems={sale.exchangeAsReplacement.return.items}
                      replacementItems={
                        sale.exchangeAsReplacement.replacementSale.items
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {approvedReturns.length > 0 && (
            <div className="mt-6 border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-brown mb-4">
                سجل المرتجعات
              </h3>
              <div className="space-y-4">
                {approvedReturns.map((ret) => (
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
                          {ret.items.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-red-100 last:border-0"
                            >
                              <td className="py-1">
                                {item.variant.product.nameAr ||
                                  item.variant.product.name}
                              </td>
                              <td className="py-1">
                                {item.variant.size} / {item.variant.color}
                              </td>
                              <td className="py-1 text-red-600 font-medium">
                                {item.quantity}
                              </td>
                              <td className="py-1">
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="py-1 font-medium">
                                {formatCurrency(item.totalPrice)}
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
        </CardContent>
      </Card>
    </div>
  );
}

function formatSettlement(balance: number) {
  if (balance > 0) return `تم تحصيل ${formatCurrency(balance)}`;
  if (balance < 0) return `تم رد ${formatCurrency(Math.abs(balance))}`;
  return "تم الاستبدال دون فرق مالي";
}

function ExchangeItems({
  returnedItems,
  replacementItems,
}: {
  returnedItems: ExchangeItem[];
  replacementItems: ExchangeItem[];
}) {
  return (
    <div className="mt-4 space-y-4">
      {returnedItems.length > 0 && (
        <ExchangeItemsTable
          title="الأصناف المرتجعة"
          items={returnedItems}
          returned
        />
      )}
      {replacementItems.length > 0 && (
        <ExchangeItemsTable
          title="الأصناف البديلة"
          items={replacementItems}
        />
      )}
    </div>
  );
}

function ExchangeItemsTable({
  title,
  items,
  returned = false,
}: {
  title: string;
  items: ExchangeItem[];
  returned?: boolean;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-brown">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-muted">
              <th className="py-1 text-start">المنتج</th>
              <th className="py-1 text-start">المقاس/اللون</th>
              <th className="py-1 text-start">الكمية</th>
              <th className="py-1 text-start">السعر</th>
              <th className="py-1 text-start">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gold/10 last:border-0"
              >
                <td className="py-1">
                  {item.variant.product.nameAr || item.variant.product.name}
                </td>
                <td className="py-1">
                  {item.variant.size} / {item.variant.color}
                </td>
                <td
                  className={`py-1 font-medium ${returned ? "text-red-600" : ""}`}
                >
                  {item.quantity}
                </td>
                <td className="py-1">{formatCurrency(item.unitPrice)}</td>
                <td className="py-1 font-medium">
                  {formatCurrency(item.totalPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
