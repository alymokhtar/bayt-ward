import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getDashboardRecentSales } from "@/lib/actions/dashboard";
import {
  formatCurrency,
  formatDateTime,
  getPaymentMethodLabel,
} from "@/lib/utils";
import Link from "next/link";

export default async function DashboardRecentSalesSection() {
  const recentSales = await getDashboardRecentSales();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>أحدث المبيعات</CardTitle>
        <Link href="/sales" prefetch={false} className="text-sm text-gold hover:underline">
          عرض الكل
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الكاشير</TableHead>
              <TableHead>الدفع</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  <Link
                    href={`/sales/${sale.id}`}
                    prefetch={false}
                    className="text-gold hover:underline font-medium"
                  >
                    {sale.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  {sale.customer?.name || (
                    <span className="text-muted">عميل نقدي</span>
                  )}
                </TableCell>
                <TableCell>{sale.user.name}</TableCell>
                <TableCell>
                  {getPaymentMethodLabel(sale.paymentMethod)}
                </TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(sale.totalAmount)}
                </TableCell>
                <TableCell className="text-muted text-sm">
                  {formatDateTime(sale.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
