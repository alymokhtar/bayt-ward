import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSalePayments } from "./sales-payment-utils";

test("caps a single overpayment to the sale total for payment records", () => {
  const result = normalizeSalePayments({
    payments: [{ amount: 300, method: "CASH" }],
    paidAmount: 300,
    totalAmount: 200,
    paymentMethod: "CASH",
  });

  assert.deepStrictEqual(result.normalizedPayments, [{ amount: 200, method: "CASH" }]);
  assert.equal(result.effectivePaidAmount, 200);
});

test("preserves mixed payments when they exactly match the total", () => {
  const result = normalizeSalePayments({
    payments: [{ amount: 100, method: "CASH" }, { amount: 100, method: "CARD" }],
    paidAmount: 200,
    totalAmount: 200,
    paymentMethod: "CASH",
  });

  assert.deepStrictEqual(result.normalizedPayments, [
    { amount: 100, method: "CASH" },
    { amount: 100, method: "CARD" },
  ]);
  assert.equal(result.effectivePaidAmount, 200);
});
