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

function buildPdfFilename(date: Date): string {
  const stamp = date.toISOString().slice(0, 10);
  return `bayt-ward-reorder-${stamp}.pdf`;
}

function sortLowStockItems(items: LowStockExportItem[]): LowStockExportItem[] {
  return items.slice().sort((a, b) => {
    const productCompare = a.productName.localeCompare(b.productName, "ar");
    if (productCompare !== 0) return productCompare;

    const colorCompare = a.color.localeCompare(b.color, "ar");
    if (colorCompare !== 0) return colorCompare;

    return a.size.localeCompare(b.size, "ar");
  });
}

function formatGeneratedAt(date: Date): string {
  const dateLabel = date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateLabel} - ${timeLabel}`;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildReportHtml(
  items: LowStockExportItem[],
  options: { categoryLabel: string; generatedAt: Date }
): string {
  const rows = sortLowStockItems(items)
    .map((item) => {
      const reorderQty = suggestedReorderQuantity(
        item.stockQuantity,
        item.minStockLevel
      );

      return `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.color)}</td>
          <td>${escapeHtml(item.size)}</td>
          <td class="number">${escapeHtml(item.stockQuantity)}</td>
          <td class="number">${escapeHtml(item.minStockLevel)}</td>
          <td class="number strong">${escapeHtml(reorderQty)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="pdf-report" dir="rtl" lang="ar">
      <style>
        @font-face {
          font-family: "ArabTypeReport";
          src: url("/fonts/arabtype.ttf") format("truetype");
          font-weight: 400 700;
        }

        .pdf-report {
          width: 186mm;
          min-height: 273mm;
          box-sizing: border-box;
          padding: 0;
          color: #000000;
          background: #ffffff;
          font-family: "ArabTypeReport", "Cairo", "Segoe UI", Tahoma, Arial, sans-serif;
          font-size: 17px;
          line-height: 1.65;
          direction: rtl;
          unicode-bidi: isolate;
        }

        .pdf-header {
          border: 1px solid #c9a84c;
          border-radius: 8px;
          background: #fcfaf6;
          padding: 18px 20px;
          text-align: center;
          margin-bottom: 18px;
          break-inside: avoid;
        }

        .pdf-title {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
        }

        .pdf-subtitle {
          margin: 6px 0 0;
          color: #000000;
          font-size: 19px;
        }

        .pdf-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 18px;
          break-inside: avoid;
        }

        .pdf-meta-item {
          border: 1px solid #e8e0d5;
          border-radius: 8px;
          background: #fcfaf6;
          padding: 9px 12px;
        }

        .pdf-meta-label {
          color: #000000;
          font-size: 15px;
        }

        .pdf-meta-value {
          margin-top: 2px;
          font-size: 18px;
          font-weight: 700;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          direction: rtl;
        }

        thead {
          display: table-header-group;
        }

        tr {
          break-inside: avoid;
        }

        th,
        td {
          border: 1px solid #e8e0d5;
          padding: 9px 8px;
          vertical-align: middle;
          overflow-wrap: anywhere;
          text-align: center;
        }

        th {
          background: #f5f0e8;
          font-weight: 700;
          font-size: 17px;
        }

        tbody tr:nth-child(even) td {
          background: #fcfaf6;
        }

        td {
          text-align: center;
          font-size: 16px;
        }

        .number {
          direction: ltr;
          unicode-bidi: embed;
          text-align: center;
          font-family: "Segoe UI", Tahoma, Arial, sans-serif;
        }

        .strong {
          color: #000000;
          font-weight: 700;
        }

        .product-column {
          width: 36%;
        }

        .small-column {
          width: 14%;
        }

        .number-column {
          width: 12%;
        }

        .pdf-footer {
          margin-top: 16px;
          padding-top: 10px;
          border-top: 1px solid #e8e0d5;
          color: #000000;
          text-align: center;
          font-size: 15px;
          break-inside: avoid;
        }
      </style>

      <header class="pdf-header">
        <h1 class="pdf-title">بيت ورد - طلب إعادة مخزون</h1>
        <p class="pdf-subtitle">منتجات بمخزون منخفض أو نافد</p>
      </header>

      <div class="pdf-meta">
        <div class="pdf-meta-item">
          <div class="pdf-meta-label">التصنيف</div>
          <div class="pdf-meta-value">${escapeHtml(options.categoryLabel)}</div>
        </div>
        <div class="pdf-meta-item">
          <div class="pdf-meta-label">عدد الأصناف</div>
          <div class="pdf-meta-value number">${escapeHtml(items.length)}</div>
        </div>
        <div class="pdf-meta-item">
          <div class="pdf-meta-label">تاريخ التقرير</div>
          <div class="pdf-meta-value">${escapeHtml(formatGeneratedAt(options.generatedAt))}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="product-column">المنتج</th>
            <th class="small-column">اللون</th>
            <th class="small-column">المقاس</th>
            <th class="number-column">المتاح</th>
            <th class="number-column">الحد الأدنى</th>
            <th class="number-column">المقترح</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <footer class="pdf-footer">
        تم إنشاء التقرير من نظام بيت ورد - للاستخدام الداخلي في إعادة الطلب من الموردين
      </footer>
    </section>
  `;
}

function createReportElement(html: string): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "pdf-render-root";
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.position = "fixed";
  wrapper.style.top = "0";
  wrapper.style.left = "0";
  wrapper.style.width = "210mm";
  wrapper.style.padding = "12mm";
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#000000";
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "2147483647";
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return wrapper;
}

function preparePdfClone(clonedDocument: Document): void {
  clonedDocument.head
    .querySelectorAll('style, link[rel="stylesheet"]')
    .forEach((node) => node.remove());

  const html = clonedDocument.documentElement;
  const body = clonedDocument.body;
  html.style.background = "#ffffff";
  html.style.color = "#000000";
  body.style.background = "#ffffff";
  body.style.color = "#000000";

  const wrapper = clonedDocument.querySelector<HTMLElement>(".pdf-render-root");
  if (wrapper) {
    wrapper.style.position = "static";
    wrapper.style.top = "auto";
    wrapper.style.left = "auto";
    wrapper.style.width = "210mm";
    wrapper.style.minHeight = "297mm";
    wrapper.style.margin = "0";
    wrapper.style.padding = "12mm";
    wrapper.style.background = "#ffffff";
    wrapper.style.color = "#000000";
    wrapper.style.pointerEvents = "auto";
    wrapper.style.zIndex = "auto";
    wrapper.style.overflow = "visible";
    wrapper.style.transform = "none";
  }
}

export async function exportLowStockToPdf(
  items: LowStockExportItem[],
  options: { categoryLabel: string; generatedAt: Date }
): Promise<void> {
  if (items.length === 0) return;

  const { default: html2pdf } = await import("html2pdf.js");
  const reportElement = createReportElement(buildReportHtml(items, options));
  const printableElement =
    reportElement.querySelector<HTMLElement>(".pdf-report") ?? reportElement;

  try {
    await Promise.all([
      document.fonts?.load('12px "ArabTypeReport"') ?? Promise.resolve(),
      document.fonts?.ready ?? Promise.resolve(),
    ]);

    await html2pdf()
      .set({
        margin: [12, 12, 12, 12],
        filename: buildPdfFilename(options.generatedAt),
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          letterRendering: true,
          onclone: preparePdfClone,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      })
      .from(printableElement)
      .save();
  } finally {
    reportElement.remove();
  }
}
