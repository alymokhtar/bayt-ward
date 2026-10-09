import test from "node:test";
import assert from "node:assert/strict";

import { formatPhoneForWhatsApp, getWhatsAppUrl } from "./whatsapp";
import {
  buildStoreCartOrderMessage,
  buildStoreOrderMessage,
} from "./store/whatsapp";

test("formats local Egyptian phone numbers to international WhatsApp format", () => {
  assert.equal(formatPhoneForWhatsApp("01012345678"), "+201012345678");
  assert.equal(formatPhoneForWhatsApp("+201012345678"), "+201012345678");
  assert.equal(formatPhoneForWhatsApp("  +2 010 123 456 78  "), "+201012345678");
});

test("builds WhatsApp URLs with the normalized phone number", () => {
  assert.equal(
    getWhatsAppUrl("01012345678", "مرحبا"),
    "https://wa.me/+201012345678?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7"
  );
});

test("includes a full product link in the direct order WhatsApp message", () => {
  const message = buildStoreOrderMessage({
    productName: "فستان",
    color: "أبيض",
    size: "M",
    productId: "prod-123",
  });

  assert.match(message, /مرحباً متجر Bayt Ward، أرغب في إتمام طلب هذا المنتج:/);
  assert.match(message, /الرابط:/);
  assert.match(message, /\/store\/product\/prod-123/);
});

test("adds color and size query params to the product link", () => {
  const message = buildStoreOrderMessage({
    productName: "فستان",
    color: "أبيض",
    size: "M",
    productId: "prod-123",
  });

  assert.match(message, /\/store\/product\/prod-123\?/);
  assert.match(message, /color=/);
  assert.match(message, /size=M/);
});

test("includes original price, promotion savings, and final quantity total for a single product", () => {
  const message = buildStoreOrderMessage({
    productName: "فستان",
    productId: "prod-123",
    price: 100,
    quantity: 2,
    discountAmount: 20,
    savingsPercent: 10,
    finalTotal: 180,
    currencySymbol: "MRU",
  });

  assert.match(message, /سعر الوحدة قبل الخصم: 100 MRU/);
  assert.match(message, /المجموع قبل الخصم: 200 MRU/);
  assert.match(message, /الخصم المطبق: - 20 MRU/);
  assert.match(message, /نسبة التوفير: 10%/);
  assert.match(message, /الإجمالي بعد الخصم: 180 MRU/);
});

test("formats cart order lines and totals consistently with the provided discount calculation", () => {
  const message = buildStoreCartOrderMessage(
    [
      {
        productName: "فستان",
        productUrl: "/store/product/prod-123",
        quantity: 2,
        unitPrice: 100,
        currencySymbol: "MRU",
      },
    ],
    {
      subtotal: 200,
      discountAmount: 20,
      finalTotal: 180,
      appliedPromotions: [{ title: "خصم 10%", discountValue: 20 }],
      currencySymbol: "MRU",
    },
  );

  assert.match(message, /الكمية: 2/);
  assert.match(message, /السعر: 200 MRU/);
  assert.match(message, /المجموع الفرعي: 200 MRU/);
  assert.match(message, /الخصم: - 20 MRU/);
  assert.match(message, /إجمالي الخصم: - 20 MRU/);
  assert.match(message, /نسبة التوفير: 10%/);
  assert.match(message, /الإجمالي بعد الخصم: 180 MRU/);
});
