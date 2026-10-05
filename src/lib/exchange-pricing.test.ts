import assert from "node:assert/strict";
import test from "node:test";
import {
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
