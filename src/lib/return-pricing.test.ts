import assert from "node:assert/strict";
import test from "node:test";
import { calculateReturnRefundAmount } from "./return-pricing";

test("refunds the discounted net price for a returned sale item", () => {
  const result = calculateReturnRefundAmount({
    unitPrice: 100,
    quantity: 2,
    discountAmount: 20,
  }, 1);

  assert.equal(result.netUnitPrice, 90);
  assert.equal(result.refundAmount, 90);
});

test("allocates partial-return rounding so repeated refunds equal the net line total", () => {
  const saleItem = { unitPrice: 10, quantity: 3, discountAmount: 1 };
  const first = calculateReturnRefundAmount(saleItem, 1, 0, 0);
  const second = calculateReturnRefundAmount(saleItem, 1, 1, first.refundAmount);
  const third = calculateReturnRefundAmount(
    saleItem,
    1,
    2,
    first.refundAmount + second.refundAmount,
  );

  assert.equal(first.refundAmount + second.refundAmount + third.refundAmount, 29);
});

test("prorates a sale-wide discount across each returned sale line", () => {
  const result = calculateReturnRefundAmount({
    unitPrice: 20,
    quantity: 2,
    discountAmount: 4,
  }, 1);

  assert.equal(result.netUnitPrice, 18);
  assert.equal(result.refundAmount, 18);
});

test("rejects zero, fractional, and over-return quantities", () => {
  const saleItem = { unitPrice: 50, quantity: 2, discountAmount: 0 };

  assert.throws(() => calculateReturnRefundAmount(saleItem, 0), /positive integer/);
  assert.throws(() => calculateReturnRefundAmount(saleItem, 1.5), /positive integer/);
  assert.throws(() => calculateReturnRefundAmount(saleItem, 2, 1), /remaining sold quantity/);
  assert.throws(() => calculateReturnRefundAmount(saleItem, 1, 0, Number.NaN), /non-negative and finite/);
});