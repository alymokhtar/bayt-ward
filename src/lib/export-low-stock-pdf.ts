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

function buildReportHtml(
  items: LowStockExportItem[],
  options: { categoryLabel: string; generatedAt: Date }
): string {
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

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>طلب إعادة مخزون</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #4B3621;
      font-family: Tahoma, Arial, sans-serif;
    }
    body {
      width: 794px;
      padding: 24px;
      direction: rtl;
      unicode-bidi: isolate;
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
      margin: 4px 0 0;
      font-size: 13px;
      color: #6B5B4F;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 13px;
      flex-wrap: wrap;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #E8E0D5;
      padding: 8px 6px;
      text-align: right;
      vertical-align: top;
    }
    th {
      background: #F5F0E8;
    }
    .footer {
      margin-top: 20px;
      font-size: 11px;
      color: #6B5B4F;
      text-align: center;
    }
    .num {
      direction: ltr;
      unicode-bidi: isolate;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>بيت ورد — طلب إعادة مخزون</h1>
    <p>منتجات بمخزون منخفض أو نافد</p>
  </div>
  <div class="meta">
    <div>التصنيف: <strong>${escapeHtml(options.categoryLabel)}</strong></div>
    <div>عدد الأصناف: <strong>${items.length}</strong></div>
    <div>التاريخ: <strong>${dateLabel} — ${timeLabel}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>المنتج</th>
        <th>المقاس / اللون</th>
        <th class="num">SKU</th>
        <th>التصنيف</th>
        <th>الكمية المتاحة</th>
        <th>الحد الأدنى</th>
        <th>كمية مقترحة للطلب</th>
        <th>الحالة</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    تم إنشاء التقرير من نظام بيت ورد — للاستخدام الداخلي في إعادة الطلب من الموردين
  </div>
</body>
</html>`;
}

function buildPdfFilename(date: Date): string {
  const stamp = date.toISOString().slice(0, 10);
  return `bayt-ward-reorder-${stamp}.pdf`;
}

export async function exportLowStockToPdf(
  items: LowStockExportItem[],
  options: { categoryLabel: string; generatedAt: Date }
): Promise<void> {
  if (items.length === 0) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px";
  iframe.style.height = "1123px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  try {
    const reportHtml = buildReportHtml(items, options);

    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("FAILED_TO_RENDER_PDF_FRAME"));
      iframe.srcdoc = reportHtml;
    });

    const iframeDocument = iframe.contentDocument;
    if (!iframeDocument) {
      throw new Error("FAILED_TO_ACCESS_PDF_FRAME");
    }

    await iframeDocument.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const html2pdf = (await import("html2pdf.js")).default;
    const source = iframeDocument.body;

    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: buildPdfFilename(options.generatedAt),
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(source)
      .save();
  } finally {
    document.body.removeChild(iframe);
  }
}
