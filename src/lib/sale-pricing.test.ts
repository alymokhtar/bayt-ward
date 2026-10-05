import assert from "node:assert/strict";
import test from "node:test";
import { allocateInvoiceDiscount } from "./sale-pricing";

test("allocates a global discount pro-rata and exactly reconciles invoice totals", () => {
  const allocation = allocateInvoiceDiscount([
    { key: "small", unitPrice: 10, quantity: 1 },
    { key: "large", unitPrice: 20, quantity: 1 },
  ], 2.01);

  assert.equal(allocation.subtotal, 30);
  assert.equal(allocation.discountAmount, 2.01);
  assert.equal(allocation.totalAmount, 27.99);
  assert.deepEqual(allocation.lines.map(({ discountAmount, netAmount }) => ({ discountAmount, netAmount })), [
    { discountAmount: 0.67, netAmount: 9.33 },
    { discountAmount: 1.34, netAmount: 18.66 },
  ]);
  assert.equal(
    Math.round(allocation.lines.reduce((sum, line) => sum + line.discountAmount, 0) * 100),
    Math.round(allocation.discountAmount * 100),
  );
  assert.equal(
    Math.round(allocation.lines.reduce((sum, line) => sum + line.netAmount, 0) * 100),
    Math.round(allocation.totalAmount * 100),
  );
});

test("distributes rounding cents deterministically and caps discounts at subtotal", () => {
  const allocation = allocateInvoiceDiscount([
    { key: "first", unitPrice: 0.01, quantity: 1 },
    { key: "second", unitPrice: 0.01, quantity: 1 },
    { key: "third", unitPrice: 0.01, quantity: 1 },
  ], 5);

  assert.equal(allocation.discountAmount, 0.03);
  assert.deepEqual(allocation.lines.map((line) => line.discountAmount), [0.01, 0.01, 0.01]);
  assert.equal(allocation.totalAmount, 0);
});