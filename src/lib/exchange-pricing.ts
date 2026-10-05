export type ExchangeQuantity = {
  variantId: string;
  quantity: number;
};

export type ExchangeStockChange = {
  variantId: string;
  previousQty: number;
  newQty: number;
};

export type ExchangeReturnPricingLine = {
  productId: string;
  quantity: number;
  refundAmount: number;
};

export type ExchangeReplacementPricingLine = {
  key: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
};

export type EqualProductExchangePricing = {
  lines: ExchangeReplacementPricingLine[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  exchangeDiscountAmount: number;
};

function toCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Exchange prices must be non-negative and finite");
  }
  return Math.round((amount + Number.EPSILON) * 100);
}

function allocateCentsByWeight(
  totalCents: number,
  weights: number[],
): number[] {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal === 0) {
    return weights.map((_, index) => index === 0 ? totalCents : 0);
  }

  const shares = weights.map((weight, index) => {
    const numerator = totalCents * weight;
    return {
      index,
      cents: Math.floor(numerator / weightTotal),
      remainder: numerator % weightTotal,
    };
  });
  let remainingCents = totalCents - shares.reduce((sum, share) => sum + share.cents, 0);
  const remainderOrder = [...shares]
    .sort((first, second) => second.remainder - first.remainder || first.index - second.index);
  for (const share of remainderOrder) {
    if (remainingCents <= 0) break;
    shares[share.index].cents += 1;
    remainingCents -= 1;
  }
  return shares.map((share) => share.cents);
}

export function applyEqualProductExchangePricing(
  returnedItems: ExchangeReturnPricingLine[],
  replacementItems: ExchangeReplacementPricingLine[],
): EqualProductExchangePricing {
  const returnedByProduct = new Map<string, { quantity: number; refundCents: number }>();
  for (const item of returnedItems) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Returned exchange items must have a product and positive quantity");
    }
    const totals = returnedByProduct.get(item.productId) ?? {
      quantity: 0,
      refundCents: 0,
    };
    totals.quantity += item.quantity;
    totals.refundCents += toCents(item.refundAmount);
    returnedByProduct.set(item.productId, totals);
  }

  const replacementByProduct = new Map<string, number[]>();
  replacementItems.forEach((item, index) => {
    if (
      !item.key ||
      !item.productId ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error("Replacement exchange items must have a product and positive quantity");
    }
    toCents(item.unitPrice);
    toCents(item.grossAmount);
    toCents(item.discountAmount);
    toCents(item.netAmount);
    const indices = replacementByProduct.get(item.productId) ?? [];
    indices.push(index);
    replacementByProduct.set(item.productId, indices);
  });

  const lines = replacementItems.map((item) => ({ ...item }));
  let exchangeDiscountCents = 0;

  for (const [productId, returned] of returnedByProduct) {
    const indices = replacementByProduct.get(productId);
    if (!indices) continue;
    const replacementQuantity = indices.reduce(
      (sum, index) => sum + replacementItems[index].quantity,
      0,
    );
    if (replacementQuantity !== returned.quantity) continue;

    const netWeights = indices.map((index) => toCents(replacementItems[index].netAmount));
    const weights = netWeights.some((weight) => weight > 0)
      ? netWeights
      : indices.map((index) => toCents(replacementItems[index].grossAmount));
    const targetLineCents = allocateCentsByWeight(returned.refundCents, weights);

    indices.forEach((lineIndex, index) => {
      const currentLine = replacementItems[lineIndex];
      const targetCents = targetLineCents[index];
      const grossCents = toCents(currentLine.grossAmount);
      const currentNetCents = toCents(currentLine.netAmount);
      const discountCents = Math.max(0, grossCents - targetCents);
      const adjustedGrossCents = targetCents > grossCents ? targetCents : grossCents;
      const exchangeDiscount = Math.max(0, currentNetCents - targetCents);
      exchangeDiscountCents += exchangeDiscount;
      lines[lineIndex] = {
        ...currentLine,
        unitPrice: adjustedGrossCents / 100 / currentLine.quantity,
        grossAmount: adjustedGrossCents / 100,
        discountAmount: discountCents / 100,
        netAmount: targetCents / 100,
      };
    });
  }

  const subtotalCents = lines.reduce((sum, line) => sum + toCents(line.grossAmount), 0);
  const discountCents = lines.reduce((sum, line) => sum + toCents(line.discountAmount), 0);
  const totalCents = lines.reduce((sum, line) => sum + toCents(line.netAmount), 0);

  return {
    lines,
    subtotal: subtotalCents / 100,
    discountAmount: discountCents / 100,
    totalAmount: totalCents / 100,
    exchangeDiscountAmount: exchangeDiscountCents / 100,
  };
}

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
