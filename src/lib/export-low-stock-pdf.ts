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

function buildReportElement(
  items: LowStockExportItem[],
  options: { categoryLabel: string; generatedAt: Date }
): HTMLDivElement {
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

  const container = document.createElement("div");
  container.dataset.lowStockPdf = "true";
  container.dir = "rtl";
  container.lang = "ar";
  container.style.cssText =
    "width:794px;padding:24px;background:#fff;color:#4B3621;font-family:var(--font-cairo),Cairo,sans-serif;visibility:hidden;position:fixed;left:0;top:0;pointer-events:none;";

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #C9A84C;">
      <h1 style="margin:0 0 4px;font-size:22px;color:#4B3621;">بيت ورد — طلب إعادة مخزون</h1>
      <p style="margin:4px 0;font-size:13px;color:#6B5B4F;">منتجات بمخزون منخفض أو نافد</p>
    </div>
    <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:16px;font-size:13px;">
      <div>التصنيف: <strong>${escapeHtml(options.categoryLabel)}</strong></div>
      <div>عدد الأصناف: <strong>${items.length}</strong></div>
      <div>التاريخ: <strong>${dateLabel} — ${timeLabel}</strong></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr>
          <th style="border:1px solid #E8E0D5;padding:8px 6px;text-align:right;background:#F5F0E8;">#</th>
          <th style="border:1px solid #E8E0D5;padding:8px 6px;text-align:right;background:#F5F0E8;">المنتج</th>
          <th style="border:1px solid #E8E0D5;padding:8px 6px;text-align:right;background:#F5F0E8;">المقاس / اللون</th>
          <th style="border:1px solid #E8E0D5;padding:8px 6px;text-align:right;background:#F5F0E8;">SKU</th>
          <th style="border:1px solid #E8E0D5;padding:8px 6px;text-align:right;background:#F5F0E8;">التصنيف</th>
          <th style="border:1px solid #E8E0D5;padding:8px 6px;text-align:right;background:#F5F0E8;">الكمية المتاحة</th>
          <th style="border:1px solid #E8E0D5;padding:8px 6px;text-align:right;background:#F5F0E8;">الحد الأدنى</th>
          <th style="border:1px solid #E8E0D5;padding:8px 6px;text-align:right;background:#F5F0E8;">كمية مقترحة للطلب</th>
          <th style="border:1px solid #E8E0D5;padding:8px 6px;text-align:right;background:#F5F0E8;">الحالة</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:20px;font-size:11px;color:#6B5B4F;text-align:center;">
      تم إنشاء التقرير من نظام بيت ورد — للاستخدام الداخلي في إعادة الطلب من الموردين
    </p>
  `;

  return container;
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

  const container = buildReportElement(items, options);
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  try {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const html2pdf = (await import("html2pdf.js")).default;

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
          onclone: (clonedDocument: Document) => {
            const clonedContainer = clonedDocument.querySelector(
              '[data-low-stock-pdf="true"]'
            ) as HTMLDivElement | null;

            if (!clonedContainer) return;

            clonedContainer.style.visibility = "visible";
            clonedContainer.style.position = "relative";
            clonedContainer.style.left = "0";
            clonedContainer.style.top = "0";
            clonedContainer.style.pointerEvents = "auto";
            clonedContainer.style.zIndex = "auto";
            clonedContainer.style.margin = "0";
            clonedDocument.body.style.margin = "0";
            clonedDocument.body.style.background = "#fff";
          },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}
