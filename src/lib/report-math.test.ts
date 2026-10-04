import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCostOfGoodsSoldFromSnapshots,
  calculateProfitMetrics,
  calculateSalesReportMetrics,
} from "@/lib/report-math";

test("calculates net sales from gross sales, discounts, and returns using accrual revenue for AOV", () => {
  const result = calculateSalesReportMetrics({
    grossSalesBeforeDiscount: 1500,
    totalDiscount: 100,
    totalReturns: 50,
    accrualRevenue: 1400,
    salesCount: 2,
  });

  assert.equal(result.netSales, 1350);
  assert.equal(result.accrualRevenue, 1400);
  assert.equal(result.averageSale, 700);
});

test("returns zero AOV for empty sales and normalizes non-finite report values", () => {
  const result = calculateSalesReportMetrics({
    grossSalesBeforeDiscount: 0,
    totalDiscount: Number.NaN,
    totalReturns: 0,
    accrualRevenue: Number.NaN,
    salesCount: 0,
  });

  assert.equal(result.netSales, 0);
  assert.equal(result.averageSale, 0);
  assert.equal(result.accrualRevenue, 0);
});

test("keeps historical COGS tied to sale and return snapshots, not current variant cost", () => {
  const historicalSaleCostSnapshot = 2 * 40;
  const historicalReturnCostSnapshot = 1 * 40;
  const currentVariantCost = 125;

  const cogs = calculateCostOfGoodsSoldFromSnapshots(
    historicalSaleCostSnapshot,
    historicalReturnCostSnapshot,
  );

  assert.equal(cogs, 40);
  assert.notEqual(cogs, 2 * currentVariantCost - currentVariantCost);
});

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
