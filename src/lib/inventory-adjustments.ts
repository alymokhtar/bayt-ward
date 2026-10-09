export const MANUAL_STOCK_MOVEMENT_TYPES = ["ADJUSTMENT", "DAMAGE"] as const;

export type ManualStockMovementType =
  (typeof MANUAL_STOCK_MOVEMENT_TYPES)[number];

export function validateManualStockAdjustment(
  type: string,
  quantity: number,
): string | null {
  if (
    !MANUAL_STOCK_MOVEMENT_TYPES.some((allowedType) => allowedType === type)
  ) {
    return "نوع الحركة غير مسموح به في التسوية اليدوية";
  }

  if (!Number.isInteger(quantity) || quantity === 0) {
    return "الكمية يجب أن تكون رقماً صحيحاً مختلفاً عن صفر";
  }

  if (type === "DAMAGE" && quantity >= 0) {
    return "كمية التالف يجب أن تكون سالبة";
  }

  return null;
}

export function calculateStockReductionValue(
  quantity: number,
  costPrice: number,
): number {
  if (quantity >= 0 || !Number.isFinite(costPrice) || costPrice < 0) {
    throw new Error("بيانات تقييم نقص المخزون غير صالحة");
  }

  const reductionValue = Math.abs(quantity * costPrice);
  const roundedValue =
    Math.round(
      (reductionValue + Number.EPSILON * reductionValue) * 100,
    ) / 100;
  return -roundedValue;
}
