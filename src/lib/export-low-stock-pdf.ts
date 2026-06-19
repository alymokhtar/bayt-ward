import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

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

type PdfTextInput = string | number;

const PDF_FONT_NAME = "ArabType";
const PDF_FONT_FILE = "arabtype.ttf";
const PDF_FONT_URL = "/fonts/arabtype.ttf";

let arabicFontDataPromise: Promise<string> | null = null;

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

function pdfText(doc: jsPDF, value: PdfTextInput): string {
  return doc.processArabic(String(value));
}

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return binary;
}

async function loadArabicFontData(): Promise<string> {
  arabicFontDataPromise ??= fetch(PDF_FONT_URL).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load PDF font: ${response.status}`);
    }

    return arrayBufferToBinaryString(await response.arrayBuffer());
  });

  return arabicFontDataPromise;
}

async function registerArabicFont(doc: jsPDF): Promise<void> {
  const fontData = await loadArabicFontData();

  doc.addFileToVFS(PDF_FONT_FILE, fontData);
  doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, "normal");
  doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, "bold");
  doc.setFont(PDF_FONT_NAME, "normal");
}

export async function exportLowStockToPdf(
  items: LowStockExportItem[],
  options: { categoryLabel: string; generatedAt: Date }
): Promise<void> {
  if (items.length === 0) return;

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  await registerArabicFont(doc);

  doc.setLanguage("ar-EG");
  doc.setR2L(true);
  doc.setProperties({
    title: "Bayt Ward Reorder Report",
    subject: "Low stock reorder report",
    creator: "Bayt Ward",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  doc.setFillColor(252, 250, 246);
  doc.setDrawColor(201, 168, 76);
  doc.roundedRect(margin, 10, pageWidth - margin * 2, 28, 2, 2, "FD");

  doc.setTextColor(75, 54, 33);
  doc.setFont(PDF_FONT_NAME, "bold");
  doc.setFontSize(17);
  doc.text(pdfText(doc, "بيت ورد - طلب إعادة مخزون"), pageWidth / 2, 21, {
    align: "center",
  });

  doc.setFont(PDF_FONT_NAME, "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 91, 79);
  doc.text(pdfText(doc, "منتجات بمخزون منخفض أو نافد"), pageWidth / 2, 30, {
    align: "center",
  });

  const metaTop = 45;
  const metaBoxWidth = (pageWidth - margin * 2 - 8) / 3;
  const metaItems = [
    ["التصنيف", options.categoryLabel],
    ["عدد الأصناف", items.length],
    ["تاريخ التقرير", formatGeneratedAt(options.generatedAt)],
  ];

  metaItems.forEach(([label, value], index) => {
    const x = margin + index * (metaBoxWidth + 4);
    doc.setFillColor(252, 250, 246);
    doc.setDrawColor(232, 224, 213);
    doc.roundedRect(x, metaTop, metaBoxWidth, 18, 2, 2, "FD");

    doc.setFont(PDF_FONT_NAME, "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 91, 79);
    doc.text(pdfText(doc, label), x + metaBoxWidth - 3, metaTop + 6, {
      align: "right",
    });

    doc.setFont(PDF_FONT_NAME, "bold");
    doc.setFontSize(9);
    doc.setTextColor(75, 54, 33);
    doc.text(pdfText(doc, value), x + metaBoxWidth - 3, metaTop + 13, {
      align: "right",
      maxWidth: metaBoxWidth - 6,
    });
  });

  const body = sortLowStockItems(items).map((item) => [
    pdfText(doc, item.productName),
    pdfText(doc, item.color),
    pdfText(doc, item.size),
    String(item.stockQuantity),
    String(item.minStockLevel),
    String(suggestedReorderQuantity(item.stockQuantity, item.minStockLevel)),
  ]);

  autoTable(doc, {
    startY: 72,
    head: [
      [
        pdfText(doc, "المنتج"),
        pdfText(doc, "اللون"),
        pdfText(doc, "المقاس"),
        pdfText(doc, "المتاح"),
        pdfText(doc, "الحد الأدنى"),
        pdfText(doc, "المقترح"),
      ],
    ],
    body,
    theme: "grid",
    margin: { left: margin, right: margin },
    tableWidth: "auto",
    styles: {
      font: PDF_FONT_NAME,
      fontSize: 8,
      cellPadding: 2.2,
      halign: "right",
      valign: "middle",
      overflow: "linebreak",
      lineColor: [232, 224, 213],
      lineWidth: 0.1,
      textColor: [75, 54, 33],
    },
    headStyles: {
      fillColor: [245, 240, 232],
      textColor: [75, 54, 33],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [252, 250, 246],
    },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 24, halign: "center" },
      5: { cellWidth: 22, halign: "center" },
    },
    didDrawPage: (data) => {
      const pageNumber = doc.getCurrentPageInfo().pageNumber;

      doc.setDrawColor(232, 224, 213);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      doc.setFont(PDF_FONT_NAME, "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 91, 79);
      doc.text(
        pdfText(
          doc,
          "تم إنشاء التقرير من نظام بيت ورد - للاستخدام الداخلي في إعادة الطلب من الموردين"
        ),
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" }
      );
      doc.text(String(pageNumber), data.settings.margin.left, pageHeight - 9);
    },
  });

  doc.save(buildPdfFilename(options.generatedAt));
}
