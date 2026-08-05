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
