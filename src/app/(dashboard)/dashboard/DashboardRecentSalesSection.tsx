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
  getPaymentDisplayLabel,
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
                  {sale.paymentMethod === null && sale.exchangeAsReplacement
                    ? formatExchangePayment(sale.exchangeAsReplacement)
                    : getPaymentDisplayLabel(sale.paymentMethod, sale.payments)}
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

function formatExchangePayment(exchange: {
  settlementBalance: number;
  settlements: Array<{
    direction: string;
    amount: number;
    method: string;
  }>;
}) {
  if (exchange.settlementBalance === 0) {
    return <span className="text-sm text-muted">استبدال — لا يوجد فرق مالي</span>;
  }

  if (exchange.settlements.length === 0) {
    return (
      <span className="text-sm text-muted">
        استبدال — فرق {formatCurrency(Math.abs(exchange.settlementBalance))}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap gap-1 text-sm">
      <span>استبدال —</span>
      {exchange.settlements.map((settlement, index) => (
        <span key={`${settlement.direction}-${settlement.method}-${index}`}>
          {settlement.direction === "COLLECTION" ? "تحصيل" : "رد"}{" "}
          {formatCurrency(settlement.amount)} عبر{" "}
          {getPaymentMethodLabel(settlement.method)}
          {index < exchange.settlements.length - 1 ? "،" : ""}
        </span>
      ))}
    </span>
  );
}
