export const DEFAULT_LOYALTY_COUPON_THRESHOLD = 5_000;
export const LOYALTY_COUPON_DISCOUNT_AMOUNT = 100;
export const LOYALTY_COUPON_EXPIRY_DAYS = 15;

export function getLoyaltyCouponEligibility(input: {
  totalSpent: number;
  customThreshold: number | null;
  lastIssuedLevel: number | null;
}) {
  const threshold = input.customThreshold ?? DEFAULT_LOYALTY_COUPON_THRESHOLD;
  const lastIssuedLevel = input.lastIssuedLevel ?? 0;
  const nextLevel = lastIssuedLevel + 1;
  const nextThreshold = threshold * nextLevel;

  return {
    threshold,
    nextLevel,
    nextThreshold,
    eligible:
      Number.isFinite(input.totalSpent) &&
      Number.isFinite(threshold) &&
      threshold > 0 &&
      Number.isSafeInteger(lastIssuedLevel) &&
      lastIssuedLevel >= 0 &&
      input.totalSpent >= nextThreshold,
  };
}
