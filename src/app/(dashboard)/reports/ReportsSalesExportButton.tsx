"use client";

import Button from "@/components/ui/Button";
import { getSalesExport } from "@/lib/actions/sales";
import type { SalesChannelFilter } from "@/lib/sales-analytics";
import { formatDateTime, getPaymentDisplayLabel } from "@/lib/utils";
import { Download } from "lucide-react";
import { useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "مكتملة",
  PENDING: "قيد الانتظار",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
  PARTIALLY_REFUNDED: "جزئي",
};

export default function ReportsSalesExportButton({
  from,
  to,
  channel,
}: {
  from: string;
  to: string;
  channel: SalesChannelFilter;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  async function exportSales() {
    setExporting(true);
    setError("");
    try {
      const rows = await getSalesExport({ from, to, channel });
      const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const csv = [
        ["رقم الفاتورة", "قناة البيع", "العميل", "الإجمالي", "الحالة", "طريقة الدفع", "التاريخ"],
        ...rows.map((sale) => [
          sale.invoiceNumber,
          sale.channel === "ONLINE" ? "المتجر" : "الفرع",
          sale.customer?.name || "نقدي",
          sale.totalAmount,
          STATUS_LABELS[sale.status] || sale.status,
          getPaymentDisplayLabel(sale.paymentMethod),
          formatDateTime(sale.createdAt),
        ]),
      ].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
      const objectUrl = URL.createObjectURL(
        new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
      );
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `reports-sales-${from}-${to}-${channel.toLowerCase()}.csv`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setError("تعذر تصدير التقرير. حاول مرة أخرى");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" className="gap-2" onClick={exportSales} disabled={exporting}>
        <Download className="h-4 w-4" />
        {exporting ? "جارٍ التصدير" : "تصدير CSV"}
      </Button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </div>
  );
}