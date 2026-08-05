import test from "node:test";
import assert from "node:assert/strict";

import { formatPhoneForWhatsApp, getWhatsAppUrl } from "./whatsapp";
import { buildStoreOrderMessage } from "./store/whatsapp";

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

  assert.match(message, /مرحبا بيت ورد/);
  assert.match(message, /الرابط:/);
  assert.match(message, /\/store\/product\/prod-123/);
});
