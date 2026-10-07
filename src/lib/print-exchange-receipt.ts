import type { ExchangeReceiptData } from "@/components/pos/ExchangeReceiptInvoice";
import JsBarcode from "jsbarcode";
import { isCode128Compatible } from "@/lib/barcode";
import { formatCurrency, formatNumber, getPaymentMethodLabel } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatExchangeDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function renderItems(items: ExchangeReceiptData["returnedItems"], sign: "+" | "-") {
  return items.map((item) => `
    <div class="item">
      <div class="item-name">${escapeHtml(item.name)}</div>
      ${item.size || item.color
        ? `<div class="variant">${escapeHtml([item.size, item.color].filter(Boolean).join(" / "))}</div>`
        : ""}
      <div class="item-row">
        <span></span>
        <span class="center">${item.quantity}</span>
        <span class="num">${escapeHtml(formatNumber(item.unitPrice))}</span>
        <span class="num bold">${sign} ${escapeHtml(formatNumber(item.totalPrice))}</span>
      </div>
    </div>
  `).join("");
}

export function buildExchangeReceiptPrintHtml(
  data: ExchangeReceiptData,
  barcodeDataUrl?: string,
) {
  const currencySymbol = data.currencySymbol || "ج.م";
  const fmt = (amount: number) => escapeHtml(formatCurrency(amount, currencySymbol));
  const barcodeHtml = barcodeDataUrl
    ? `<div class="barcode"><img src="${escapeHtml(barcodeDataUrl)}" alt="باركود فاتورة البديل ${escapeHtml(data.replacementInvoiceNumber)}" /><div class="barcode-number num">${escapeHtml(data.replacementInvoiceNumber)}</div></div>`
    : "";
  const settlementDescription = data.settlementBalance > 0
    ? `المطلوب تحصيله: ${fmt(data.settlementBalance)}`
    : data.settlementBalance < 0
      ? `المبلغ المردود للعميل: ${fmt(Math.abs(data.settlementBalance))}`
      : "الاستبدال متكافئ — لا يوجد فرق مالي";
  const settlementMethod = data.settlementBalance !== 0 && data.settlementMethod
    ? `<div class="center-text">طريقة التسوية: ${escapeHtml(getPaymentMethodLabel(data.settlementMethod))}</div>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>فاتورة استبدال ${escapeHtml(data.exchangeNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 80mm;
      margin: 0 auto;
      padding: 4mm;
      font-family: "Courier New", Courier, monospace;
      font-size: 11px;
      line-height: 1.5;
      color: #000;
      background: #fff;
    }
    .center-text { text-align: center; }
    .store-name { font-size: 15px; font-weight: 700; }
    .dash { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .bold { font-weight: 700; }
    .section-title { margin-bottom: 4px; text-align: center; font-weight: 700; }
    .head-row, .item-row {
      display: grid;
      grid-template-columns: 1fr 18px 48px 58px;
      gap: 4px;
    }
    .head-row { font-size: 9px; font-weight: 700; }
    .head-row span:not(:first-child), .item-row .num { text-align: left; direction: ltr; }
    .head-row span:nth-child(2), .item-row .center { text-align: center; }
    .item { margin: 5px 0; }
    .item-name { font-weight: 700; word-break: break-word; }
    .variant { color: #444; font-size: 10px; }
    .totals { margin-top: 4px; }
    .settlement { text-align: center; font-size: 12px; font-weight: 700; }
    .footer { text-align: center; font-size: 9px; }
    .barcode { width: 100%; margin: 8px auto; text-align: center; }
    .barcode img { display: block; width: min(100%, 68mm); height: auto; margin: 0 auto; }
    .barcode-number { margin-top: 3px; font-size: 11px; font-weight: 700; }
    .num { direction: ltr; unicode-bidi: isolate; }
    @page { size: 80mm auto; margin: 0; }
    @media print { body { width: 80mm; } }
  </style>
</head>
<body>
  <div class="center-text">
    <div class="store-name">${escapeHtml(data.storeNameAr || "بيت ورد")}</div>
    ${data.storePhone ? `<div class="num">ت: ${escapeHtml(data.storePhone)}</div>` : ""}
  </div>
  <hr class="dash" />
  <div class="center-text">
    <div class="bold">فاتورة استبدال</div>
    <div class="num">${escapeHtml(data.exchangeNumber)}</div>
    <div>الفاتورة الأصلية: <span class="num">${escapeHtml(data.originalInvoiceNumber)}</span></div>
    <div>رقم المرتجع: <span class="num">${escapeHtml(data.returnNumber)}</span></div>
    <div>فاتورة البديل: <span class="num">${escapeHtml(data.replacementInvoiceNumber)}</span></div>
    <div>${escapeHtml(formatExchangeDateTime(data.createdAt))}</div>
  </div>
  <hr class="dash" />
  ${`<div class="row"><span>الكاشير:</span><span>${escapeHtml(data.cashierName)}</span></div>`}
  ${`<div class="row"><span>العميل:</span><span>${escapeHtml(data.customerName || "عميل نقدي")}</span></div>`}
  ${data.customerPhone ? `<div class="row"><span>الهاتف:</span><span class="num">${escapeHtml(data.customerPhone)}</span></div>` : ""}
  <hr class="dash" />
  <div class="section-title">الأصناف المرتجعة (−)</div>
  <div class="head-row"><span>الصنف</span><span>ك</span><span>السعر</span><span>الصافي</span></div>
  ${renderItems(data.returnedItems, "-")}
  <div class="row bold"><span>إجمالي المرتجع</span><span class="num">− ${fmt(data.refundAmount)}</span></div>
  <hr class="dash" />
  <div class="section-title">الأصناف البديلة (+)</div>
  <div class="head-row"><span>الصنف</span><span>ك</span><span>السعر</span><span>الإجمالي</span></div>
  ${renderItems(data.replacementItems, "+")}
  <div class="totals">
    <div class="row"><span>مجموع البدائل</span><span class="num">${fmt(data.replacementSubtotal)}</span></div>
    ${data.replacementDiscountAmount > 0
      ? `<div class="row"><span>خصومات البدائل</span><span class="num">− ${fmt(data.replacementDiscountAmount)}</span></div>`
      : ""}
    <div class="row bold"><span>صافي البدائل</span><span class="num">${fmt(data.replacementTotal)}</span></div>
  </div>
  <hr class="dash" />
  <div class="settlement">${settlementDescription}</div>
  ${settlementMethod}
  <hr class="dash" />
  ${barcodeHtml}
  <div class="footer">يرجى الاحتفاظ بفاتورة الاستبدال<br />*** نهاية الفاتورة ***</div>
</body>
</html>`;
}

export function printExchangeReceipt(data: ExchangeReceiptData): boolean {
  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) return false;

  let barcodeDataUrl: string | undefined;
  if (isCode128Compatible(data.replacementInvoiceNumber)) {
    try {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, data.replacementInvoiceNumber.trim(), {
        format: "CODE128",
        width: 1.3,
        height: 42,
        displayValue: false,
        margin: 2,
        lineColor: "#000000",
        background: "#ffffff",
      });
      const svgMarkup = new XMLSerializer().serializeToString(svg);
      barcodeDataUrl = `data:image/svg+xml;base64,${window.btoa(svgMarkup)}`;
    } catch (error) {
      console.error("Failed to generate replacement invoice barcode:", error);
    }
  }

  printWindow.document.open();
  printWindow.document.write(buildExchangeReceiptPrintHtml(data, barcodeDataUrl));
  printWindow.document.close();

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    window.setTimeout(() => {
      if (!printWindow.closed) printWindow.close();
    }, 500);
  }, 250);

  return true;
}
