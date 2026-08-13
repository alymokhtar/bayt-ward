import test from "node:test";
import assert from "node:assert/strict";
import { getSalePaymentSummary, normalizeSalePayments } from "./sales-payment-utils";
import { getPaymentDisplayLabel } from "./utils";

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

test("shows the single payment method for one payment entry", () => {
  assert.equal(getPaymentDisplayLabel("MIXED", [{ method: "CASH" }]), "كاش");
});

test("shows mixed for multiple payment entries", () => {
  assert.equal(getPaymentDisplayLabel("CASH", [{ method: "CASH" }, { method: "CARD" }]), "مختلط");
});

test("uses payment rows as the source of truth for historical sales totals", () => {
  const result = getSalePaymentSummary({
    totalAmount: 200,
    fallbackPaidAmount: 999,
    paymentMethod: "CASH",
    payments: [
      { method: "CASH", amount: 120 },
      { method: "CARD", amount: 80 },
    ],
  });

  assert.equal(result.paidAmount, 200);
  assert.equal(result.remainingAmount, 0);
  assert.equal(result.paymentSummary, "MIXED");
});
