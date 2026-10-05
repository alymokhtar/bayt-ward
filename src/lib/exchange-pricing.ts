export type ExchangeQuantity = {
  variantId: string;
  quantity: number;
};

export type ExchangeStockChange = {
  variantId: string;
  previousQty: number;
  newQty: number;
};

export function calculateExchangeSettlementBalance(
  replacementTotal: number,
  refundTotal: number,
): number {
  if (!Number.isFinite(replacementTotal) || replacementTotal < 0) {
    throw new Error("Replacement total must be non-negative and finite");
  }
  if (!Number.isFinite(refundTotal) || refundTotal < 0) {
    throw new Error("Refund total must be non-negative and finite");
  }

  return Math.round((replacementTotal - refundTotal + Number.EPSILON) * 100) / 100;
}

export function calculateExchangeStockChanges(
  stockByVariant: ReadonlyMap<string, number>,
  returnedItems: ExchangeQuantity[],
  replacementItems: ExchangeQuantity[],
): ExchangeStockChange[] {
  const quantityChanges = new Map<string, number>();

  for (const item of returnedItems) {
    if (!item.variantId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Returned quantities must be positive integers");
    }
    quantityChanges.set(
      item.variantId,
      (quantityChanges.get(item.variantId) ?? 0) + item.quantity,
    );
  }

  for (const item of replacementItems) {
    if (!item.variantId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Replacement quantities must be positive integers");
    }
    quantityChanges.set(
      item.variantId,
      (quantityChanges.get(item.variantId) ?? 0) - item.quantity,
    );
  }

  return [...quantityChanges].map(([variantId, quantityChange]) => {
    const previousQty = stockByVariant.get(variantId);
    if (previousQty === undefined || !Number.isInteger(previousQty) || previousQty < 0) {
      throw new Error(`Current stock is invalid for variant ${variantId}`);
    }
    const newQty = previousQty + quantityChange;
    if (newQty < 0) {
      throw new Error(`Insufficient stock for variant ${variantId}`);
    }
    return { variantId, previousQty, newQty };
  });
}
