import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCartDiscounts,
  getPromotionDateRangeBounds,
  isPromotionDateRangeActive,
  type CartItem,
  type Promotion,
} from "./promotions";

const cartItems: CartItem[] = [
  {
    productId: "dress",
    categoryId: "clothing",
    unitPrice: 100,
    quantity: 2,
    name: "Dress",
  },
  {
    productId: "scarf",
    categoryId: "accessories",
    unitPrice: 30,
    quantity: 1,
    name: "Scarf",
  },
];

function promotion(overrides: Partial<Promotion>): Promotion {
  return {
    id: "promotion-1",
    name: "Promotion",
    type: "PERCENTAGE",
    isActive: true,
    ...overrides,
  };
}

test("applies buy-X-get-Y to the cheapest eligible items only", () => {
  const result = calculateCartDiscounts(
    cartItems,
    [
      promotion({
        type: "BUY_X_GET_Y",
        buyQuantity: 2,
        getQuantity: 1,
        discountPercent: 100,
        categories: [{ id: "clothing" }],
        products: [{ id: "scarf" }],
      }),
    ],
    new Date("2026-10-01T12:00:00.000Z"),
  );

  assert.deepEqual(result, {
    originalTotal: 230,
    discountAmount: 30,
    finalTotal: 200,
    appliedPromotions: [
      { id: "promotion-1", title: "Promotion", discountValue: 30 },
    ],
  });
});

test("defaults buy-X-get-Y to a full discount and counts repeated groups", () => {
  const result = calculateCartDiscounts(
    [{ ...cartItems[1], quantity: 6 }],
    [promotion({ type: "BUY_X_GET_Y", buyQuantity: 2, getQuantity: 1 })],
  );

  assert.equal(result.discountAmount, 60);
  assert.equal(result.finalTotal, 120);
});

test("uses direct discount below the buy-X-get-Y quantity threshold", () => {
  const result = calculateCartDiscounts(
    [{ ...cartItems[0], quantity: 2 }],
    [
      promotion({
        id: "quantity",
        type: "BUY_X_GET_Y",
        buyQuantity: 2,
        getQuantity: 1,
        categories: [{ id: "clothing" }],
      }),
      promotion({ id: "percentage", discountPercent: 10 }),
    ],
  );

  assert.equal(result.discountAmount, 20);
  assert.equal(result.finalTotal, 180);
  assert.deepEqual(result.appliedPromotions.map(({ id }) => id), ["percentage"]);
});

test("gives a qualifying quantity promotion priority over a direct discount on the same product", () => {
  const result = calculateCartDiscounts(
    [{ ...cartItems[0], quantity: 3 }],
    [
      promotion({
        id: "quantity",
        type: "BUY_X_GET_Y",
        buyQuantity: 2,
        getQuantity: 1,
        categories: [{ id: "clothing" }],
      }),
      promotion({ id: "percentage", discountPercent: 50 }),
      promotion({ id: "fixed", type: "FIXED_AMOUNT", discountAmount: 50 }),
    ],
  );

  assert.equal(result.discountAmount, 100);
  assert.equal(result.finalTotal, 200);
  assert.deepEqual(result.appliedPromotions, [
    { id: "quantity", title: "Promotion", discountValue: 100 },
  ]);
});

test("applies direct discounts only to products not reserved by a quantity promotion", () => {
  const result = calculateCartDiscounts(
    [{ ...cartItems[0], quantity: 3 }, cartItems[1]],
    [
      promotion({
        id: "quantity",
        type: "BUY_X_GET_Y",
        buyQuantity: 2,
        getQuantity: 1,
        categories: [{ id: "clothing" }],
      }),
      promotion({ id: "percentage", discountPercent: 10 }),
    ],
  );

  assert.equal(result.originalTotal, 330);
  assert.equal(result.discountAmount, 103);
  assert.equal(result.finalTotal, 227);
  assert.deepEqual(result.appliedPromotions, [
    { id: "quantity", title: "Promotion", discountValue: 100 },
    { id: "percentage", title: "Promotion", discountValue: 3 },
  ]);
});

test("does not stack overlapping direct promotions on the same product", () => {
  const result = calculateCartDiscounts(
    [{ ...cartItems[0], quantity: 2 }],
    [
      promotion({ id: "fixed", type: "FIXED_AMOUNT", discountAmount: 50 }),
      promotion({ id: "percentage", discountPercent: 20 }),
    ],
  );

  assert.equal(result.discountAmount, 50);
  assert.equal(result.finalTotal, 150);
  assert.deepEqual(result.appliedPromotions.map(({ id }) => id), ["fixed"]);
});

test("ignores inactive and out-of-date promotions", () => {
  const result = calculateCartDiscounts(
    cartItems,
    [
      promotion({ isActive: false, discountPercent: 50 }),
      promotion({ id: "future", startDate: "2026-10-02", discountPercent: 50 }),
      promotion({ id: "expired", endDate: "2026-09-30", discountPercent: 50 }),
    ],
    new Date("2026-10-01T12:00:00.000Z"),
  );

  assert.equal(result.discountAmount, 0);
  assert.deepEqual(result.appliedPromotions, []);
});

test("treats promotion date bounds as inclusive Cairo calendar days", () => {
  const shortlyAfterCairoMidnight = new Date("2026-10-01T21:05:00.000Z");
  const shortlyBeforeCairoMidnight = new Date("2026-10-02T20:55:00.000Z");

  assert.equal(
    isPromotionDateRangeActive("2026-10-01T21:00:00.000Z", "2026-10-02T20:59:59.999Z", shortlyAfterCairoMidnight),
    true,
  );
  assert.equal(
    isPromotionDateRangeActive(null, "2026-10-01T20:59:59.999Z", shortlyAfterCairoMidnight),
    false,
  );
  assert.equal(
    isPromotionDateRangeActive("2026-10-02T21:00:00.000Z", null, shortlyBeforeCairoMidnight),
    false,
  );
  assert.equal(
    isPromotionDateRangeActive(null, "2026-10-02T20:59:59.999Z", new Date("2026-10-02T21:00:00.000Z")),
    false,
  );
});

test("returns Cairo-local query bounds for each calendar day", () => {
  const { dayStart, dayEnd } = getPromotionDateRangeBounds(new Date("2026-10-02T12:00:00.000Z"));

  assert.equal(dayStart.toISOString(), "2026-10-01T21:00:00.000Z");
  assert.equal(dayEnd.toISOString(), "2026-10-02T20:59:59.999Z");
});

test("checks the cart minimum and caps independent promotions at their eligible item totals", () => {
  const result = calculateCartDiscounts(cartItems, [
    promotion({ id: "below-minimum", minOrderAmount: 231, discountAmount: 500 }),
    promotion({
      id: "fixed",
      type: "FIXED_AMOUNT",
      discountAmount: 500,
      products: [{ id: "dress" }],
    }),
    promotion({
      id: "percentage",
      discountPercent: 100,
      products: [{ id: "scarf" }],
    }),
  ]);

  assert.equal(result.originalTotal, 230);
  assert.equal(result.discountAmount, 230);
  assert.equal(result.finalTotal, 0);
  assert.deepEqual(result.appliedPromotions.map(({ id }) => id), ["fixed", "percentage"]);
});

test("returns a zero result for empty carts and ignores malformed cart rows", () => {
  const result = calculateCartDiscounts(
    [
      { ...cartItems[0], unitPrice: Number.NaN },
      { ...cartItems[1], quantity: 0 },
    ],
    [promotion({ discountPercent: 100 })],
  );

  assert.deepEqual(result, {
    originalTotal: 0,
    discountAmount: 0,
    finalTotal: 0,
    appliedPromotions: [],
  });
});