import assert from "node:assert/strict";
import test from "node:test";
import { formatPromotionOfferText } from "./promotion-format";

test("formats percentage promotions with and without a minimum spend", () => {
  assert.equal(
    formatPromotionOfferText({
      type: "PERCENTAGE",
      discountPercent: 10,
      minOrderAmount: 1000,
    }),
    "خصم 10% عند الشراء بـ 1,000 جنيه أو أكثر",
  );
  assert.equal(
    formatPromotionOfferText({ type: "PERCENTAGE", discountPercent: 10 }),
    "خصم 10% على السلة",
  );
});

test("formats fixed discounts with and without a minimum spend", () => {
  assert.equal(
    formatPromotionOfferText({
      type: "FIXED_AMOUNT",
      discountAmount: 100,
      minOrderAmount: 1000,
    }),
    "خصم 100 جنيه عند الشراء بـ 1,000 جنيه أو أكثر",
  );
  assert.equal(
    formatPromotionOfferText({ type: "FIXED_AMOUNT", discountAmount: 100 }),
    "خصم 100 جنيه على السلة",
  );
});

test("prefers a configured promotion description over generated copy", () => {
  assert.equal(
    formatPromotionOfferText({
      type: "PERCENTAGE",
      description: "خصم خاص للعملاء الجدد",
      discountPercent: 10,
      minOrderAmount: 1000,
    }),
    "خصم خاص للعملاء الجدد",
  );
});