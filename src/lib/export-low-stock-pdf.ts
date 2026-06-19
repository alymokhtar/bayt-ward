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

  const groupedItems = Array.from(
    items
      .slice()
      .sort((a, b) => {
        const productCompare = a.productName.localeCompare(b.productName, "ar");
        if (productCompare !== 0) return productCompare;

        const colorCompare = a.color.localeCompare(b.color, "ar");
        if (colorCompare !== 0) return colorCompare;

        return a.size.localeCompare(b.size, "ar");
      })
      .reduce((groups, item) => {
        const group = groups.get(item.productName) ?? [];
        group.push(item);
        groups.set(item.productName, group);
        return groups;
      }, new Map<string, LowStockExportItem[]>())
      .entries()
  );

  const tableRows = groupedItems
    .map(([productName, productItems]) => {
      const groupRows = productItems
        .map((item) => {
          return `
            <tr>
              <td>${escapeHtml(productName)}</td>
              <td>${escapeHtml(item.color)}</td>
              <td>${escapeHtml(item.size)}</td>
              <td>${item.stockQuantity}</td>
              <td>${item.minStockLevel}</td>
              <td>${suggestedReorderQuantity(
                item.stockQuantity,
                item.minStockLevel
              )}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <tr class="group-row">
          <td colspan="6">${escapeHtml(productName)}</td>
        </tr>
        ${groupRows}
      `;
    })
    .join("");

  return `
    <section class="pdf-report" dir="rtl" lang="ar">
      <style>
        .pdf-report {
          width: 794px;
          min-height: 1123px;
          padding: 28px;
          background: #ffffff;
          color: #4B3621;
          direction: rtl;
          font-family: Tahoma, Arial, "Segoe UI", sans-serif;
          line-height: 1.6;
          unicode-bidi: isolate;
        }
        .pdf-page {
          min-height: 1067px;
          border: 1px solid #E8E0D5;
          padding: 24px;
          background: #ffffff;
        }
        .pdf-header {
          margin-bottom: 18px;
          padding: 18px 16px;
          border: 2px solid #C9A84C;
          background: #FCFAF6;
          text-align: center;
        }
        .pdf-header h1 {
          margin: 0 0 8px;
          color: #4B3621;
          font-size: 24px;
          font-weight: 700;
        }
        .pdf-header p {
          margin: 0;
          color: #6B5B4F;
          font-size: 13px;
        }
        .pdf-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 18px;
          font-size: 13px;
        }
        .pdf-meta div {
          border: 1px solid #E8E0D5;
          border-radius: 8px;
          background: #FCFAF6;
          padding: 10px;
        }
        .pdf-meta span {
          display: block;
          margin-bottom: 4px;
          color: #6B5B4F;
          font-size: 11px;
        }
        .pdf-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          background: #ffffff;
          font-size: 12px;
        }
        .pdf-table th,
        .pdf-table td {
          border: 1px solid #E8E0D5;
          padding: 9px 8px;
          text-align: right;
          vertical-align: top;
          word-break: break-word;
        }
        .pdf-table th {
          background: #F5F0E8;
          color: #4B3621;
          font-weight: 700;
          text-align: center;
        }
        .pdf-table tbody tr:nth-child(even) {
          background: #FCFAF6;
        }
        .pdf-table .group-row td {
          background: #EFE4CF;
          color: #4B3621;
          font-weight: 700;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .pdf-table td:nth-child(4),
        .pdf-table td:nth-child(5),
        .pdf-table td:nth-child(6) {
          text-align: center;
          white-space: nowrap;
        }
        .pdf-footer {
          margin-top: 20px;
          border-top: 1px solid #E8E0D5;
          padding-top: 12px;
          color: #6B5B4F;
          text-align: center;
          font-size: 11px;
        }
      </style>
      <div class="pdf-page">
        <div class="pdf-header">
          <h1>بيت ورد - طلب إعادة مخزون</h1>
          <p>منتجات بمخزون منخفض أو نافد</p>
        </div>
        <div class="pdf-meta">
          <div><span>التصنيف</span><strong>${escapeHtml(options.categoryLabel)}</strong></div>
          <div><span>عدد الأصناف</span><strong>${items.length}</strong></div>
          <div><span>تاريخ التقرير</span><strong>${dateLabel} - ${timeLabel}</strong></div>
        </div>
        <table class="pdf-table">
          <thead>
            <tr>
              <th style="width:28%">المنتج</th>
              <th style="width:16%">اللون</th>
              <th style="width:16%">المقاس</th>
              <th style="width:14%">المتاح</th>
              <th style="width:13%">الحد الأدنى</th>
              <th style="width:13%">المقترح</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="pdf-footer">
          تم إنشاء التقرير من نظام بيت ورد - للاستخدام الداخلي في إعادة الطلب من الموردين
        </div>
      </div>
    </section>
  `;
}

function buildPdfFilename(date: Date): string {
  const stamp = date.toISOString().slice(0, 10);
  return `bayt-ward-reorder-${stamp}.pdf`;
}

function createPdfFrame(html: string): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.left = "0";
  frame.style.top = "0";
  frame.style.width = "794px";
  frame.style.height = "1123px";
  frame.style.border = "0";
  frame.style.pointerEvents = "none";
  frame.style.zIndex = "-1";
  frame.style.opacity = "0";

  document.body.appendChild(frame);

  const frameDocument = frame.contentDocument;
  if (!frameDocument) {
    document.body.removeChild(frame);
    throw new Error("FAILED_TO_CREATE_PDF_FRAME");
  }

  frameDocument.open();
  frameDocument.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <style>
          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  frameDocument.close();

  return frame;
}

export async function exportLowStockToPdf(
  items: LowStockExportItem[],
  options: { categoryLabel: string; generatedAt: Date }
): Promise<void> {
  if (items.length === 0) return;

  const frame = createPdfFrame(buildReportHtml(items, options));

  try {
    const frameDocument = frame.contentDocument;
    const frameWindow = frame.contentWindow;

    if (!frameDocument || !frameWindow) {
      throw new Error("FAILED_TO_CREATE_PDF_FRAME");
    }

    await frameDocument.fonts.ready;
    await new Promise<void>((resolve) => {
      frameWindow.requestAnimationFrame(() =>
        frameWindow.requestAnimationFrame(() => resolve())
      );
    });

    const html2pdf = (await import("html2pdf.js")).default;
    const source = frameDocument.querySelector(".pdf-report");

    if (!source) {
      throw new Error("FAILED_TO_BUILD_PDF_SOURCE");
    }

    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: buildPdfFilename(options.generatedAt),
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(source as HTMLElement)
      .save();
  } finally {
    document.body.removeChild(frame);
  }
}
