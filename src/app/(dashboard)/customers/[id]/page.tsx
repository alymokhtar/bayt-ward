import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getCustomer } from "@/lib/actions/customers";
import { formatCurrency, formatDateTime, getSaleStatusLabel } from "@/lib/utils";
import CustomerWhatsAppButton from "@/components/whatsapp/CustomerWhatsAppButton";
import { ArrowRight, Mail, MapPin, Phone, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomer(id);
  } catch {
    notFound();
  }

  return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-brown">{customer.name}</h1>
            <p className="text-sm text-muted">تفاصيل العميل وسجل المشتريات</p>
          </div>
          <CustomerWhatsAppButton
            customerName={customer.name}
            customerPhone={customer.phone}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted">إجمالي الإنفاق</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {formatCurrency(customer.totalSpent)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted">عدد الزيارات</p>
              <p className="text-2xl font-bold text-brown mt-1">
                {customer.visitCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted">عدد المبيعات</p>
              <p className="text-2xl font-bold text-brown mt-1">
                {customer.sales.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>معلومات الاتصال</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted" />
              <span dir="ltr">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted" />
                <span dir="ltr">{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted" />
                <span>{customer.address}</span>
              </div>
            )}
            {customer.notes && (
              <p className="text-muted border-t pt-3">{customer.notes}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-gold" />
              سجل المشتريات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.sales.length === 0 ? (
              <p className="text-center text-muted py-8">لا توجد مشتريات بعد</p>
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
                  {customer.sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <Link
                          href={`/sales/${sale.id}`}
                          className="text-gold hover:underline font-medium"
                        >
                          {sale.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{sale._count.items}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(sale.totalAmount)}
                      </TableCell>
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
          </CardContent>
        </Card>
      </div>
    );
}
