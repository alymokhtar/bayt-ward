import type { ReceiptData } from "@/components/pos/ReceiptInvoice";
import { formatCurrency, getPaymentMethodLabel } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatReceiptDateTime(date: Date) {
  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dashedLine() {
  return '<hr class="dash" />';
}

function row(label: string, value: string, bold = false) {
  return `<div class="row${bold ? " bold" : ""}"><span>${label}</span><span>${value}</span></div>`;
}

export function buildReceiptPrintHtml(data: ReceiptData) {
  const fmt = (amount: number) =>
    escapeHtml(formatCurrency(amount, data.currencySymbol));

  const itemsHtml = data.items
    .map((item) => {
      const variant =
        item.size || item.color
          ? `<div class="variant">${escapeHtml([item.size, item.color].filter(Boolean).join(" / "))}</div>`
          : "";

      return `
        <div class="item">
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${variant}
          <div class="item-row">
            <span></span>
            <span class="center">${item.quantity}</span>
            <span class="num">${item.unitPrice.toLocaleString("ar-EG")}</span>
            <span class="num bold">${item.totalPrice.toLocaleString("ar-EG")}</span>
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>فاتورة ${escapeHtml(data.invoiceNumber)}</title>
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
    .dash {
      border: none;
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .row.bold { font-weight: 700; font-size: 12px; }
    .head-row {
      display: grid;
      grid-template-columns: 1fr 24px 56px 56px;
      gap: 6px;
      font-weight: 700;
      font-size: 10px;
    }
    .head-row span:nth-child(2) { text-align: center; }
    .head-row span:nth-child(3),
    .head-row span:nth-child(4) { text-align: left; direction: ltr; }
    .item { margin-bottom: 8px; }
    .item-name { font-weight: 700; word-break: break-word; }
    .variant { font-size: 10px; color: #444; }
    .item-row {
      display: grid;
      grid-template-columns: 1fr 24px 56px 56px;
      gap: 6px;
      margin-top: 2px;
    }
    .item-row .center { text-align: center; }
    .item-row .num { text-align: left; direction: ltr; }
    .item-row .bold { font-weight: 700; }
    .footer { text-align: center; padding-top: 4px; }
    .footer .thanks { font-weight: 700; }
    .footer .end { font-size: 9px; color: #666; margin-top: 8px; }
    .num { direction: ltr; unicode-bidi: isolate; }
    @page { size: 80mm auto; margin: 0; }
    @media print {
      body { width: 80mm; }
    }
  </style>
</head>
<body>
  <div class="center-text">
    <div class="store-name">${escapeHtml(data.storeNameAr)}</div>
    ${
      data.storePhone
        ? `<div class="num">ت: ${escapeHtml(data.storePhone)}</div>`
        : ""
    }
  </div>

  ${dashedLine()}

  <div class="center-text">
    <div style="font-weight:700">فاتورة بيع</div>
    <div class="num">${escapeHtml(data.invoiceNumber)}</div>
    <div>${escapeHtml(formatReceiptDateTime(data.createdAt))}</div>
  </div>

  ${dashedLine()}

  ${row("الكاشير:", escapeHtml(data.cashierName))}
  ${row("العميل:", escapeHtml(data.customerName || "عميل نقدي"))}
  ${
    data.customerPhone
      ? row("الهاتف:", `<span class="num">${escapeHtml(data.customerPhone)}</span>`)
      : ""
  }

  ${dashedLine()}

  <div class="head-row">
    <span>الصنف</span><span>ك</span><span>السعر</span><span>الإجمالي</span>
  </div>

  ${dashedLine()}

  ${itemsHtml}

  ${dashedLine()}

  ${row("المجموع", fmt(data.subtotal))}
  ${
    data.discountAmount > 0
      ? row("الخصم", `- ${fmt(data.discountAmount)}`)
      : ""
  }
  ${row("الإجمالي", fmt(data.totalAmount), true)}
  ${row("المدفوع", fmt(data.paidAmount))}
  ${
    data.changeAmount > 0
      ? row("الباقي", fmt(data.changeAmount), true)
      : ""
  }
  ${row("طريقة الدفع", escapeHtml(getPaymentMethodLabel(data.paymentMethod)))}

  ${
    data.notes
      ? `${dashedLine()}<div>ملاحظات: ${escapeHtml(data.notes)}</div>`
      : ""
  }

  ${dashedLine()}

  <div class="footer">
    <div class="thanks">شكراً لزيارتكم</div>
    <div style="font-size:10px">نتمنى لكم يوماً سعيداً</div>
    <div class="end">*** نهاية الفاتورة ***</div>
  </div>
</body>
</html>`;
}

export function printReceipt(data: ReceiptData) {
  const html = buildReceiptPrintHtml(data);
  const printWindow = window.open("", "_blank", "width=420,height=640");

  if (!printWindow) {
    alert("تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    window.setTimeout(() => {
      if (!printWindow.closed) printWindow.close();
    }, 500);
  }, 250);
}
