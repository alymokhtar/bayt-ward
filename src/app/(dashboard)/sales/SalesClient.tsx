"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PaginationNav from "@/components/ui/PaginationNav";
import FilterForm from "@/components/ui/FilterForm";
import SaleDetailsModal from "@/app/(dashboard)/sales/SaleDetailsModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  formatCurrency,
  formatDateTime,
  getPaymentMethodLabel,
} from "@/lib/utils";
import { Search, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const statusLabels: Record<string, string> = {
  COMPLETED: "مكتملة",
  PENDING: "قيد الانتظار",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
  PARTIALLY_REFUNDED: "جزئي",
};

type SaleItem = {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: Date;
  customer: { name: string } | null;
  user: { name: string };
};

interface SalesClientProps {
  sales: SaleItem[];
  total: number;
  page: number;
  totalPages: number;
  params: {
    search?: string;
    status?: string;
    from?: string;
    to?: string;
  };
}

export default function SalesClient({
  sales,
  total,
  page,
  totalPages,
  params,
}: SalesClientProps) {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brown">المبيعات</h1>
          <p className="text-sm text-muted mt-1">{total} فاتورة</p>
        </div>
        <Link href="/sales/cash-register">
          <Button variant="secondary" className="gap-2">
            <Wallet className="h-4 w-4" />
            مراجعة الخزنة
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="p-2 md:p-6 pt-0">
          <FilterForm action="/sales" submitLabel="تصفية">
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
              <option value="PARTIALLY_REFUNDED">جزئي</option>
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
          </FilterForm>

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
                    <button
                      type="button"
                      onClick={() => setSelectedSaleId(sale.id)}
                      className="font-medium text-gold hover:underline"
                    >
                      {sale.invoiceNumber}
                    </button>
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
            page={page}
            totalPages={totalPages}
            basePath="/sales"
            searchParams={{
              search: params.search,
              status: params.status,
              from: params.from,
              to: params.to,
            }}
          />
        </div>
      </div>

      <SaleDetailsModal
        saleId={selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
      />
    </div>
  );
}
