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

test("returns a zero profit margin when revenue is zero or fully returned", () => {
  const noRevenue = calculateProfitMetrics({
    revenue: 0,
    totalReturns: 0,
    costOfGoodsSold: 0,
    totalExpenses: 0,
  });
  const fullyReturned = calculateProfitMetrics({
    revenue: 100,
    totalReturns: 100,
    costOfGoodsSold: 20,
    totalExpenses: 5,
  });

  assert.equal(noRevenue.profitMargin, 0);
  assert.equal(fullyReturned.profitMargin, 0);
});
