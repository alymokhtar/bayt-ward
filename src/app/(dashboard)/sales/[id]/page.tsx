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
import { getSale } from "@/lib/actions/sales";
import { STORE_NAME_AR } from "@/lib/constants";
import {
  formatCurrency,
  formatDateTime,
  getPaymentMethodLabel,
} from "@/lib/utils";
import PrintButton from "@/components/ui/PrintButton";
import SaleWhatsAppButton from "@/components/whatsapp/SaleWhatsAppButton";
import { getStoreSettings } from "@/lib/actions/settings";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusLabels: Record<string, string> = {
  COMPLETED: "مكتملة",
  PENDING: "قيد الانتظار",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
  PARTIALLY_REFUNDED: "جزئي",
};

interface SaleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { id } = await params;

  let sale;
  let settings;
  try {
    [sale, settings] = await Promise.all([getSale(id), getStoreSettings()]);
  } catch {
    notFound();
  }

  const itemsText = sale.items
      .map(
        (item) =>
          `• ${item.variant.product.nameAr || item.variant.product.name} (${item.variant.size}/${item.variant.color}) × ${item.quantity}`
      )
      .join("\n");

  // Compute returned quantity per variant
  const returnedQtyByVariant = new Map<string, number>();
  for (const ret of sale.returns) {
    if (ret.status !== "APPROVED") continue;
    for (const ri of ret.items) {
      const existing = returnedQtyByVariant.get(ri.variant.id) ?? 0;
      returnedQtyByVariant.set(ri.variant.id, existing + ri.quantity);
    }
  }

  const hasReturns = sale.returns.some((r) => r.status === "APPROVED");
  const totalRefunded = sale.returns
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + r.refundAmount, 0);

  return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/sales">
              <Button variant="ghost" size="icon">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-brown">
                فاتورة {sale.invoiceNumber}
              </h1>
              <p className="text-sm text-muted">
                {formatDateTime(sale.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge status={sale.status}>
              {statusLabels[sale.status] || sale.status}
            </Badge>
            {sale.customer?.phone && (
              <SaleWhatsAppButton
                customerName={sale.customer.name}
                customerPhone={sale.customer.phone}
                invoiceNumber={sale.invoiceNumber}
                totalAmount={sale.totalAmount}
                currencySymbol={settings.currency_symbol || "ج.م"}
                storeNameAr={settings.store_name_ar || "بيت ورد"}
                items={itemsText}
              />
            )}
            <PrintButton />
          </div>
        </div>

        <Card className="print:shadow-none print:border-none">
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
                  <TableHead>تم استرجاع</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>الخصم</TableHead>
                  <TableHead>الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item) => {
                  const returnedQty = returnedQtyByVariant.get(item.variant.id) ?? 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.variant.product.nameAr ||
                          item.variant.product.name}
                      </TableCell>
                      <TableCell>
                        {item.variant.size} / {item.variant.color}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {returnedQty > 0 ? (
                          <span className="text-red-600 font-medium">
                            {returnedQty}
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
          </CardContent>
        </Card>
      </div>
    );
}
