export interface SalesCsvRow {
  invoiceNumber: string;
  channel: "POS" | "ONLINE";
  customerName: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

const HEADERS = [
  "رقم الفاتورة",
  "قناة البيع",
  "العميل",
  "الإجمالي",
  "الحالة",
  "طريقة الدفع",
  "التاريخ",
];

function escapeCsvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function buildSalesCsv(rows: SalesCsvRow[]): string {
  const lines = [
    HEADERS,
    ...rows.map((row) => [
      row.invoiceNumber,
      row.channel === "ONLINE" ? "المتجر" : "الفرع",
      row.customerName,
      row.totalAmount,
      row.status,
      row.paymentMethod,
      row.createdAt,
    ]),
  ].map((line) => line.map(escapeCsvCell).join(","));

  return `\uFEFF${lines.join("\r\n")}`;
}