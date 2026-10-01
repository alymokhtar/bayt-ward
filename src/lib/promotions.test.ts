import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCartDiscounts,
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

test("checks minimum order amount and caps stacked discounts at the cart total", () => {
  const result = calculateCartDiscounts(cartItems, [
    promotion({ id: "below-minimum", minOrderAmount: 231, discountAmount: 500 }),
    promotion({ id: "fixed", type: "FIXED_AMOUNT", discountAmount: 100 }),
    promotion({ id: "percentage", discountPercent: 100 }),
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