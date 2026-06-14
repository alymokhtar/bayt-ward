import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PaginationNav from "@/components/ui/PaginationNav";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getSales } from "@/lib/actions/sales";
import {
  formatCurrency,
  formatDateTime,
  getPaymentMethodLabel,
} from "@/lib/utils";
import { Search } from "lucide-react";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  COMPLETED: "مكتملة",
  PENDING: "قيد الانتظار",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
};

interface SalesPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const params = await searchParams;
  const salesResult = await getSales({
    search: params.search,
    status: params.status,
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to + "T23:59:59") : undefined,
    page: params.page ? Number(params.page) : 1,
    pageSize: 50,
  });
  const sales = salesResult.items;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">المبيعات</h1>
        <p className="text-sm text-muted mt-1">{salesResult.total} فاتورة</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                name="search"
                defaultValue={params.search}
                placeholder="رقم الفاتورة أو العميل..."
                className="w-full h-10 rounded-lg border border-border bg-white ps-10 pe-4 text-sm"
              />
            </div>
            <select
              name="status"
              defaultValue={params.status || ""}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            >
              <option value="">كل الحالات</option>
              <option value="COMPLETED">مكتملة</option>
              <option value="CANCELLED">ملغاة</option>
              <option value="REFUNDED">مستردة</option>
            </select>
            <input
              type="date"
              name="from"
              defaultValue={params.from}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            />
            <input
              type="date"
              name="to"
              defaultValue={params.to}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            />
            <Button type="submit" variant="secondary">
              تصفية
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الكاشير</TableHead>
                <TableHead>الدفع</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <Link
                      href={`/sales/${sale.id}`}
                      className="font-medium text-gold hover:underline"
                    >
                      {sale.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {sale.customer?.name || (
                      <span className="text-muted">نقدي</span>
                    )}
                  </TableCell>
                  <TableCell>{sale.user.name}</TableCell>
                  <TableCell>
                    {getPaymentMethodLabel(sale.paymentMethod)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(sale.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge status={sale.status}>
                      {statusLabels[sale.status] || sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted">
                    {formatDateTime(sale.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationNav
            page={salesResult.page}
            totalPages={salesResult.totalPages}
            basePath="/sales"
            searchParams={{
              search: params.search,
              status: params.status,
              from: params.from,
              to: params.to,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
