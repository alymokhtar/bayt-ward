import assert from "node:assert/strict";
import test from "node:test";
import {
  applyEqualProductExchangePricing,
  calculateExchangeSettlementBalance,
  calculateExchangeStockChanges,
} from "./exchange-pricing";

test("calculates a positive balance when the replacement costs more", () => {
  assert.equal(calculateExchangeSettlementBalance(125, 80), 45);
});

test("calculates a negative balance when the returned items cost more", () => {
  assert.equal(calculateExchangeSettlementBalance(80, 125), -45);
});

test("returns zero for an even exchange", () => {
  assert.equal(calculateExchangeSettlementBalance(100, 100), 0);
});

test("matches a same-product swap at the refunded net price after its promotion expires", () => {
  const pricing = applyEqualProductExchangePricing(
    [{ productId: "product-x", quantity: 1, refundAmount: 100 }],
    [{
      key: "variant-new-color",
      productId: "product-x",
      quantity: 1,
      unitPrice: 150,
      grossAmount: 150,
      discountAmount: 0,
      netAmount: 150,
    }],
  );

  assert.deepEqual(pricing.lines, [{
    key: "variant-new-color",
    productId: "product-x",
    quantity: 1,
    unitPrice: 150,
    grossAmount: 150,
    discountAmount: 50,
    netAmount: 100,
  }]);
  assert.equal(pricing.exchangeDiscountAmount, 50);
  assert.equal(pricing.totalAmount, 100);
  assert.equal(calculateExchangeSettlementBalance(pricing.totalAmount, 100), 0);
});

test("does not grant an equal-product discount when product or quantity differs", () => {
  const returned = [{ productId: "product-x", quantity: 1, refundAmount: 100 }];
  const replacement = [{
    key: "variant-new-color",
    productId: "product-y",
    quantity: 1,
    unitPrice: 150,
    grossAmount: 150,
    discountAmount: 0,
    netAmount: 150,
  }];

  const differentProduct = applyEqualProductExchangePricing(returned, replacement);
  const differentQuantity = applyEqualProductExchangePricing(returned, [{
    ...replacement[0],
    productId: "product-x",
    quantity: 2,
    grossAmount: 300,
    netAmount: 300,
  }]);

  assert.equal(differentProduct.totalAmount, 150);
  assert.equal(differentProduct.exchangeDiscountAmount, 0);
  assert.equal(differentQuantity.totalAmount, 300);
  assert.equal(differentQuantity.exchangeDiscountAmount, 0);
});

test("allocates an equal-value adjustment across same-product replacement lines", () => {
  const pricing = applyEqualProductExchangePricing(
    [{ productId: "product-x", quantity: 3, refundAmount: 290 }],
    [
      {
        key: "variant-a",
        productId: "product-x",
        quantity: 1,
        unitPrice: 100,
        grossAmount: 100,
        discountAmount: 0,
        netAmount: 100,
      },
      {
        key: "variant-b",
        productId: "product-x",
        quantity: 2,
        unitPrice: 100,
        grossAmount: 200,
        discountAmount: 0,
        netAmount: 200,
      },
    ],
  );

  assert.equal(pricing.totalAmount, 290);
  assert.equal(pricing.lines.reduce((sum, line) => sum + line.netAmount, 0), 290);
  assert.equal(pricing.lines.reduce((sum, line) => sum + line.discountAmount, 0), 10);
});

test("nets returned and replacement quantities for the same variant", () => {
  const changes = calculateExchangeStockChanges(
    new Map([["variant-a", 1]]),
    [{ variantId: "variant-a", quantity: 2 }],
    [{ variantId: "variant-a", quantity: 3 }],
  );

  assert.deepEqual(changes, [
    { variantId: "variant-a", previousQty: 1, newQty: 0 },
  ]);
});

test("rejects replacement quantities that exceed stock after the return", () => {
  assert.throws(
    () => calculateExchangeStockChanges(
      new Map([["variant-a", 0]]),
      [{ variantId: "variant-a", quantity: 1 }],
      [{ variantId: "variant-a", quantity: 2 }],
    ),
    /Insufficient stock/,
  );
});
