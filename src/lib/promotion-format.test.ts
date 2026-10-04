import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPromotionOfferText,
  getStoreOnlyPromotionNotices,
} from "./promotion-format";

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

test("adds a store-only notice only for matching online cart products", () => {
  const notices = getStoreOnlyPromotionNotices(
    { productId: "dress", categoryId: "clothing", name: "فستان" },
    [
      {
        id: "matching",
        name: "خصم الفرع",
        type: "PERCENTAGE",
        isActive: true,
        isStoreOnly: true,
        discountPercent: 10,
        minOrderAmount: 1000,
        products: [{ id: "dress" }],
      },
      {
        id: "unmatched",
        name: "منتج آخر",
        type: "FIXED_AMOUNT",
        isActive: true,
        isStoreOnly: true,
        discountAmount: 100,
        products: [{ id: "scarf" }],
      },
      {
        id: "online",
        name: "عرض أونلاين",
        type: "PERCENTAGE",
        isActive: true,
        isStoreOnly: false,
        discountPercent: 20,
        products: [{ id: "dress" }],
      },
    ],
  );

  assert.deepEqual(notices, [
    "📍 ملاحظة: هذا المنتج (فستان) يتوفر عليه خصم 10% عند الشراء بـ 1,000 جنيه أو أكثر حصرياً عند الشراء من داخل فرع بيت ورد. نتشرف بزيارتكم للاستفادة من العرض!",
  ]);
});