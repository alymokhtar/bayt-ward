"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PaginationNav from "@/components/ui/PaginationNav";
import FilterForm from "@/components/ui/FilterForm";
import SaleDetailsModal from "@/app/(dashboard)/sales/SaleDetailsModal";
import SalesChannelChart from "@/app/(dashboard)/sales/SalesChannelChart";
import { getSales, getSalesExport } from "@/lib/actions/sales";
import type { SalesChannelAnalytics, SalesChannelFilter } from "@/lib/sales-analytics";
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
  getPaymentDisplayLabel,
} from "@/lib/utils";
import { Download, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

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
  channel: "POS" | "ONLINE";
  totalAmount: number;
  status: string;
  paymentMethod: string | null;
  payments?: Array<{ method?: string | null; amount?: number }>;
  createdAt: Date;
  customer: { name: string } | null;
  user: { name: string };
};

interface SalesClientProps {
  sales: SaleItem[];
  total: number;
  page: number;
  totalPages: number;
  channelAnalytics: SalesChannelAnalytics;
  params: {
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    channel: SalesChannelFilter;
  };
}

export default function SalesClient({
  sales,
  total,
  page,
  totalPages,
  channelAnalytics,
  params,
}: SalesClientProps) {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [invoiceLookupError, setInvoiceLookupError] = useState("");
  const invoiceLookupInProgress = useRef(false);
  const selectedMetrics = params.channel === "ALL"
    ? channelAnalytics.total
    : channelAnalytics.channels[params.channel];

  async function exportFilteredSales() {
    setExporting(true);
    setExportError("");
    try {
      const rows = await getSalesExport(params);
      const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const data = [
        ["رقم الفاتورة", "قناة البيع", "العميل", "الإجمالي", "الحالة", "طريقة الدفع", "التاريخ"],
        ...rows.map((sale) => [
          sale.invoiceNumber,
          sale.channel === "ONLINE" ? "المتجر" : "الفرع",
          sale.customer?.name || "نقدي",
          sale.totalAmount,
          statusLabels[sale.status] || sale.status,
          getPaymentDisplayLabel(sale.paymentMethod),
          formatDateTime(sale.createdAt),
        ]),
      ].map((row) => row.map(csvCell).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF", data], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("تعذر تصدير المبيعات. حاول مرة أخرى");
    } finally {
      setExporting(false);
    }
  }

  async function handleSalesSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    const invoiceNumber = event.currentTarget.value.trim();
    const form = event.currentTarget.form;
    setInvoiceLookupError("");
    if (!invoiceNumber || invoiceLookupInProgress.current) {
      if (!invoiceNumber) form?.requestSubmit();
      return;
    }

    const loadedSale = sales.find(
      (sale) =>
        sale.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase(),
    );
    if (loadedSale) {
      setSelectedSaleId(loadedSale.id);
      return;
    }

    invoiceLookupInProgress.current = true;
    try {
      const result = await getSales({ search: invoiceNumber, pageSize: 50 });
      const exactMatch = result.items.find(
        (sale) =>
          sale.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase(),
      );

      if (exactMatch) {
        setSelectedSaleId(exactMatch.id);
      } else {
        form?.requestSubmit();
      }
    } catch {
      setInvoiceLookupError("تعذر التحقق من رقم الفاتورة. يمكنك استخدام زر التصفية لإجراء بحث عادي.");
    } finally {
      invoiceLookupInProgress.current = false;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brown">المبيعات</h1>
          <p className="text-sm text-muted mt-1">{total} فاتورة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={exportFilteredSales} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "جارٍ التصدير" : "تصدير CSV"}
          </Button>
          <Link href="/sales/cash-register">
            <Button variant="secondary" className="gap-2">
              <Wallet className="h-4 w-4" />
              مراجعة الخزنة
            </Button>
          </Link>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-label="تحليلات المبيعات حسب القناة">
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard title="إجمالي الإيرادات" value={formatCurrency(selectedMetrics.revenue)} />
          <MetricCard title="عدد الفواتير / الطلبات" value={selectedMetrics.orders.toLocaleString("ar-EG-u-nu-latn")} />
          <MetricCard title="متوسط قيمة السلة (AOV)" value={formatCurrency(selectedMetrics.averageOrderValue)} />
        </div>
        <SalesChannelChart data={channelAnalytics.revenueMix} />
      </section>

      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="p-2 md:p-6 pt-0">
          <FilterForm action="/sales" submitLabel="تصفية">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                name="search"
                defaultValue={params.search}
                onKeyDown={handleSalesSearchKeyDown}
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
            <select
              name="channel"
              defaultValue={params.channel}
              aria-label="قناة البيع"
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            >
              <option value="ALL">كل القنوات</option>
              <option value="POS">مبيعات الفرع (POS)</option>
              <option value="ONLINE">طلبات المتجر (Online)</option>
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
          {exportError && <p role="alert" className="mb-3 text-sm text-danger">{exportError}</p>}
          {invoiceLookupError && <p role="alert" className="mb-3 text-sm text-danger">{invoiceLookupError}</p>}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>قناة البيع</TableHead>
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
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sale.channel === "ONLINE" ? "bg-sky-100 text-sky-800" : "bg-gold/10 text-brown"}`}>
                      {sale.channel === "ONLINE" ? "المتجر 🌐" : "الفرع 🏪"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {sale.customer?.name || (
                      <span className="text-muted">نقدي</span>
                    )}
                  </TableCell>
                  <TableCell>{sale.user.name}</TableCell>
                  <TableCell>
                    {getPaymentDisplayLabel(sale.paymentMethod, sale.payments)}
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
              channel: params.channel,
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

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-2 text-2xl font-bold text-brown">{value}</p>
    </div>
  );
}
