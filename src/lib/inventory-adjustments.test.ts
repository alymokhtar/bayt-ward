import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateStockReductionValue,
  validateManualStockAdjustment,
} from "@/lib/inventory-adjustments";

test("allows only manual adjustment and damage movements", () => {
  assert.equal(validateManualStockAdjustment("ADJUSTMENT", 3), null);
  assert.equal(validateManualStockAdjustment("ADJUSTMENT", -3), null);
  assert.equal(validateManualStockAdjustment("DAMAGE", -3), null);
  assert.match(
    validateManualStockAdjustment("SALE", -3) ?? "",
    /غير مسموح/,
  );
});

test("requires damage adjustments to reduce stock", () => {
  assert.match(
    validateManualStockAdjustment("DAMAGE", 1) ?? "",
    /سالبة/,
  );
  assert.match(
    validateManualStockAdjustment("DAMAGE", 0) ?? "",
    /صحيح/,
  );
});

test("values stock reductions using cost and rounds to currency precision", () => {
  assert.equal(calculateStockReductionValue(-3, 12.345), -37.04);
  assert.throws(() => calculateStockReductionValue(2, 10));
});
