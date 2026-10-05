export interface ProfitMetricsInput {
  revenue: number;
  totalReturns: number;
  costOfGoodsSold: number;
  totalExpenses: number;
}

export interface ProfitMetricsResult {
  netRevenue: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

export interface SalesReportMetricsInput {
  grossSalesBeforeDiscount: number;
  totalDiscount: number;
  totalReturns: number;
  accrualRevenue: number;
  salesCount: number;
}

export interface SalesReportMetricsResult {
  grossSalesBeforeDiscount: number;
  totalDiscount: number;
  totalReturns: number;
  accrualRevenue: number;
  netSales: number;
  averageSale: number;
}

export function calculateNetSales(
  sales: number,
  returns: number,
  expenses = 0,
): number {
  const totalSales = Number.isFinite(sales) ? sales : 0;
  const totalReturns = Number.isFinite(returns) ? returns : 0;
  const totalExpenses = Number.isFinite(expenses) ? expenses : 0;
  return totalSales - totalReturns - totalExpenses;
}

export function calculateCostOfGoodsSoldFromSnapshots(
  soldItemCostSnapshots: number,
  returnedItemCostSnapshots: number,
): number {
  const soldCost = Number.isFinite(soldItemCostSnapshots) ? soldItemCostSnapshots : 0;
  const returnedCost = Number.isFinite(returnedItemCostSnapshots) ? returnedItemCostSnapshots : 0;

  return soldCost - returnedCost;
}

export function calculateSalesReportMetrics({
  grossSalesBeforeDiscount,
  totalDiscount,
  totalReturns,
  accrualRevenue,
  salesCount,
}: SalesReportMetricsInput): SalesReportMetricsResult {
  const grossSales = Number.isFinite(grossSalesBeforeDiscount) ? grossSalesBeforeDiscount : 0;
  const discounts = Number.isFinite(totalDiscount) ? totalDiscount : 0;
  const returns = Number.isFinite(totalReturns) ? totalReturns : 0;
  const revenue = Number.isFinite(accrualRevenue) ? accrualRevenue : 0;
  const count = Number.isFinite(salesCount) && salesCount > 0 ? salesCount : 0;

  return {
    grossSalesBeforeDiscount: grossSales,
    totalDiscount: discounts,
    totalReturns: returns,
    accrualRevenue: revenue,
    netSales: calculateNetSales(grossSales - discounts, returns),
    averageSale: count > 0 ? revenue / count : 0,
  };
}

export function calculateProfitMetrics({
  revenue,
  totalReturns,
  costOfGoodsSold,
  totalExpenses,
}: ProfitMetricsInput): ProfitMetricsResult {
  const finiteOrZero = (value: number) => Number.isFinite(value) ? value : 0;
  const safeRevenue = finiteOrZero(revenue);
  const safeReturns = finiteOrZero(totalReturns);
  const safeCostOfGoodsSold = finiteOrZero(costOfGoodsSold);
  const safeExpenses = finiteOrZero(totalExpenses);
  const netRevenue = finiteOrZero(safeRevenue - safeReturns);
  const grossProfit = finiteOrZero(netRevenue - safeCostOfGoodsSold);
  const netProfit = finiteOrZero(grossProfit - safeExpenses);
  const profitMargin = finiteOrZero(
    netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0,
  );

  return {
    netRevenue,
    grossProfit,
    netProfit,
    profitMargin,
  };
}
