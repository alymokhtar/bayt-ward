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
  totalPayments: number;
  salesCount: number;
}

export interface SalesReportMetricsResult {
  grossSalesBeforeDiscount: number;
  totalDiscount: number;
  totalReturns: number;
  accrualRevenue: number;
  totalPayments: number;
  netSales: number;
  averageSale: number;
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
  totalPayments,
  salesCount,
}: SalesReportMetricsInput): SalesReportMetricsResult {
  const grossSales = Number.isFinite(grossSalesBeforeDiscount) ? grossSalesBeforeDiscount : 0;
  const discounts = Number.isFinite(totalDiscount) ? totalDiscount : 0;
  const returns = Number.isFinite(totalReturns) ? totalReturns : 0;
  const revenue = Number.isFinite(accrualRevenue) ? accrualRevenue : 0;
  const payments = Number.isFinite(totalPayments) ? totalPayments : 0;
  const count = Number.isFinite(salesCount) && salesCount > 0 ? salesCount : 0;

  return {
    grossSalesBeforeDiscount: grossSales,
    totalDiscount: discounts,
    totalReturns: returns,
    accrualRevenue: revenue,
    totalPayments: payments,
    netSales: grossSales - discounts - returns,
    averageSale: count > 0 ? revenue / count : 0,
  };
}

export function calculateProfitMetrics({
  revenue,
  totalReturns,
  costOfGoodsSold,
  totalExpenses,
}: ProfitMetricsInput): ProfitMetricsResult {
  const netRevenue = revenue - totalReturns;
  const grossProfit = netRevenue - costOfGoodsSold;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

  return {
    netRevenue,
    grossProfit,
    netProfit,
    profitMargin,
  };
}
