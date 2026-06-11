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
            </div>

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
