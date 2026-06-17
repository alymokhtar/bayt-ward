export type LowStockExportItem = {
  id: string;
  sku: string;
  productName: string;
  size: string;
  color: string;
  stockQuantity: number;
  minStockLevel: number;
  category: string;
};

export function suggestedReorderQuantity(
  stockQuantity: number,
  minStockLevel: number
): number {
  return Math.max(0, minStockLevel - stockQuantity);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportLowStockToPdf(
  items: LowStockExportItem[],
  options: { categoryLabel: string; generatedAt: Date }
): void {
  if (items.length === 0) return;

  const dateLabel = options.generatedAt.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeLabel = options.generatedAt.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows = items
    .map((item, index) => {
      const reorderQty = suggestedReorderQuantity(
        item.stockQuantity,
        item.minStockLevel
      );
      const status =
        item.stockQuantity === 0
          ? "نفد"
          : item.stockQuantity < item.minStockLevel
            ? "منخفض"
            : "عند الحد";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.size)} / ${escapeHtml(item.color)}</td>
          <td dir="ltr">${escapeHtml(item.sku)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${item.stockQuantity}</td>
          <td>${item.minStockLevel}</td>
          <td>${reorderQty}</td>
          <td>${status}</td>
        </tr>
      `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>طلب إعادة مخزون — بيت ورد</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Cairo", sans-serif;
      color: #4B3621;
      margin: 0;
      padding: 24px;
      background: #fff;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #C9A84C;
    }
    .header h1 {
      margin: 0 0 4px;
      font-size: 22px;
      color: #4B3621;
    }
    .header p {
      margin: 4px 0;
      font-size: 13px;
      color: #6B5B4F;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .meta span { font-weight: 600; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #E8E0D5;
      padding: 8px 6px;
      text-align: right;
    }
    th {
      background: #F5F0E8;
      font-weight: 700;
    }
    tr:nth-child(even) td { background: #FDFBF7; }
    .footer {
      margin-top: 20px;
      font-size: 11px;
      color: #6B5B4F;
      text-align: center;
    }
    @media print {
      body { padding: 12px; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>بيت ورد — طلب إعادة مخزون</h1>
    <p>منتجات بمخزون منخفض أو نافد</p>
  </div>
  <div class="meta">
    <div>التصنيف: <span>${escapeHtml(options.categoryLabel)}</span></div>
    <div>عدد الأصناف: <span>${items.length}</span></div>
    <div>التاريخ: <span>${dateLabel} — ${timeLabel}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>المنتج</th>
        <th>المقاس / اللون</th>
        <th>SKU</th>
        <th>التصنيف</th>
        <th>الكمية المتاحة</th>
        <th>الحد الأدنى</th>
        <th>كمية مقترحة للطلب</th>
        <th>الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p class="footer">تم إنشاء التقرير من نظام بيت ورد — للاستخدام الداخلي في إعادة الطلب من الموردين</p>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    alert("تعذّر فتح نافذة التصدير. اسمح بالنوافذ المنبثقة ثم حاول مجدداً.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
