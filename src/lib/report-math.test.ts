import assert from "node:assert/strict";
import test from "node:test";
import { calculateProfitMetrics } from "@/lib/report-math";

test("deducts expenses from net profit using the full financial formula", () => {
  const result = calculateProfitMetrics({
    revenue: 1000,
    totalReturns: 100,
    costOfGoodsSold: 300,
    totalExpenses: 50,
  });

  assert.equal(result.netRevenue, 900);
  assert.equal(result.grossProfit, 600);
  assert.equal(result.netProfit, 550);
  assert.equal(result.profitMargin, 61.111111111111114);
});
