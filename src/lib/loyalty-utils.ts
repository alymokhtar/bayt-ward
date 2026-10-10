export const LOYALTY_EARNING_AMOUNT = 100;
export const LOYALTY_POINTS_PER_EARNING_AMOUNT = 5;
export const LOYALTY_POINT_VALUE = 1;
export const LOYALTY_MIN_REDEMPTION_POINTS = 50;

export function calculateLoyaltyPointsEarned(eligibleAmount: number): number {
  if (!Number.isFinite(eligibleAmount) || eligibleAmount <= 0) return 0;
  return Math.floor(eligibleAmount / LOYALTY_EARNING_AMOUNT) *
    LOYALTY_POINTS_PER_EARNING_AMOUNT;
}
