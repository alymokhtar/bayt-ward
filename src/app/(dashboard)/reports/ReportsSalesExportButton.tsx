"use client";

import Button from "@/components/ui/Button";
import { getSalesExport } from "@/lib/actions/sales";
import { buildSalesCsv } from "@/lib/sales-export";
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
      const csv = buildSalesCsv(rows.map((sale) => ({
        invoiceNumber: sale.invoiceNumber,
        channel: sale.channel,
        customerName: sale.customer?.name || "نقدي",
        totalAmount: sale.totalAmount,
        status: STATUS_LABELS[sale.status] || sale.status,
        paymentMethod: getPaymentDisplayLabel(sale.paymentMethod),
        createdAt: formatDateTime(sale.createdAt),
      })));
      const objectUrl = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
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