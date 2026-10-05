export interface SaleItemRefundBasis {
  unitPrice: number;
  quantity: number;
  discountAmount: number;
}

export interface ReturnRefundCalculation {
  netUnitPrice: number;
  refundAmount: number;
}

function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100);
}

export function calculateReturnRefundAmount(
  saleItem: SaleItemRefundBasis,
  requestedQuantity: number,
  alreadyReturnedQuantity = 0,
  previouslyRefundedAmount = 0,
): ReturnRefundCalculation {
  if (!Number.isInteger(saleItem.quantity) || saleItem.quantity <= 0) {
    throw new Error("Sale item quantity must be a positive integer");
  }
  if (!Number.isFinite(saleItem.unitPrice) || saleItem.unitPrice < 0) {
    throw new Error("Sale item unit price must be non-negative and finite");
  }
  if (!Number.isFinite(saleItem.discountAmount) || saleItem.discountAmount < 0) {
    throw new Error("Sale item discount must be non-negative and finite");
  }
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    throw new Error("Return quantity must be a positive integer");
  }
  if (
    !Number.isInteger(alreadyReturnedQuantity) ||
    alreadyReturnedQuantity < 0 ||
    alreadyReturnedQuantity + requestedQuantity > saleItem.quantity
  ) {
    throw new Error("Return quantity exceeds the remaining sold quantity");
  }
  if (!Number.isFinite(previouslyRefundedAmount) || previouslyRefundedAmount < 0) {
    throw new Error("Previously refunded amount must be non-negative and finite");
  }

  const netLineCents = Math.max(
    0,
    toCents(saleItem.unitPrice * saleItem.quantity - saleItem.discountAmount),
  );
  const previousRefundCents = Math.min(netLineCents, toCents(previouslyRefundedAmount));
  const cumulativeQuantity = alreadyReturnedQuantity + requestedQuantity;
  const cumulativeRefundEntitlement = Math.round(
    netLineCents * cumulativeQuantity / saleItem.quantity,
  );
  const refundCents = Math.max(
    0,
    Math.min(
      netLineCents - previousRefundCents,
      cumulativeRefundEntitlement - previousRefundCents,
    ),
  );

  return {
    netUnitPrice: Math.max(0, saleItem.unitPrice - saleItem.discountAmount / saleItem.quantity),
    refundAmount: refundCents / 100,
  };
}