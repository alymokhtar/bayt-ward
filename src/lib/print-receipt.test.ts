import assert from "node:assert/strict";
import test from "node:test";
import type { ReceiptData } from "@/components/pos/ReceiptInvoice";
import { calculateCartDiscounts } from "./promotions";
import { buildReceiptPrintHtml } from "./print-receipt";

test("prints an online order at full price without store-only discounts", () => {
  const item = {
    productId: "dress",
    categoryId: "clothing",
    unitPrice: 100,
    quantity: 2,
    name: "فستان",
  };
  const promotion = {
    id: "store-only",
    name: "خصم الفرع",
    type: "PERCENTAGE" as const,
    isActive: true,
    isStoreOnly: true,
    discountPercent: 10,
    products: [{ id: "dress" }],
  };
  const calculation = calculateCartDiscounts([item], [promotion], {
    channel: "ONLINE",
  });
  const receipt: ReceiptData = {
    invoiceNumber: "INV-ONLINE-001",
    channel: "ONLINE",
    createdAt: new Date("2026-10-04T10:00:00.000Z"),
    storeNameAr: "بيت ورد",
    currencySymbol: "ج.م",
    cashierName: "الكاشير",
    paymentMethod: "CASH",
    items: [{
      name: item.name,
      size: "M",
      color: "أحمر",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice * item.quantity,
    }],
    subtotal: calculation.originalTotal,
    discountAmount: calculation.discountAmount,
    appliedPromotions: calculation.appliedPromotions,
    totalAmount: calculation.finalTotal,
    paidAmount: calculation.finalTotal,
    changeAmount: 0,
  };

  const html = buildReceiptPrintHtml(receipt);

  assert.equal(calculation.discountAmount, 0);
  assert.equal(calculation.finalTotal, 200);
  assert.match(html, /طلب متجر \/ أونلاين/);
  assert.match(html, /الإجمالي/);
  assert.match(html, /200 ج\.م/);
  assert.doesNotMatch(html, /<span>الخصم<\/span>/);
});