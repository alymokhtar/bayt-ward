export interface SaleLineForPricing {
  key: string;
  unitPrice: number;
  quantity: number;
}

export interface AllocatedSaleLine {
  key: string;
  unitPrice: number;
  quantity: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
}

export interface SalePricingAllocation {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  lines: AllocatedSaleLine[];
}

function toCents(amount: number): number {
  return Number.isFinite(amount)
    ? Math.max(0, Math.round((amount + Number.EPSILON) * 100))
    : 0;
}

export function allocateInvoiceDiscount(
  lines: SaleLineForPricing[],
  requestedDiscount: number,
): SalePricingAllocation {
  const seenKeys = new Set<string>();
  const preparedLines = lines.map((line, index) => {
    if (seenKeys.has(line.key)) throw new Error("Sale line keys must be unique");
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error("Sale line quantity must be a positive integer");
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      throw new Error("Sale line unit price must be a non-negative finite number");
    }
    seenKeys.add(line.key);
    return {
      ...line,
      index,
      grossCents: toCents(line.unitPrice * line.quantity),
    };
  });

  const subtotalCents = preparedLines.reduce((sum, line) => sum + line.grossCents, 0);
  const discountCents = Math.min(subtotalCents, toCents(requestedDiscount));
  const shares = preparedLines.map((line) => {
    const numerator = discountCents * line.grossCents;
    return {
      ...line,
      baseDiscountCents: subtotalCents > 0 ? Math.floor(numerator / subtotalCents) : 0,
      remainder: subtotalCents > 0 ? numerator % subtotalCents : 0,
    };
  });
  const undistributedCents = discountCents - shares.reduce(
    (sum, line) => sum + line.baseDiscountCents,
    0,
  );
  const remainderOrder = [...shares]
    .sort((first, second) => second.remainder - first.remainder || first.index - second.index)
    .slice(0, undistributedCents);
  const extraCentKeys = new Set(remainderOrder.map((line) => line.key));

  const allocatedLines = shares.map((line) => {
    const lineDiscountCents = line.baseDiscountCents + (extraCentKeys.has(line.key) ? 1 : 0);
    const netCents = line.grossCents - lineDiscountCents;

    return {
      key: line.key,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      grossAmount: line.grossCents / 100,
      discountAmount: lineDiscountCents / 100,
      netAmount: netCents / 100,
    };
  });

  return {
    subtotal: subtotalCents / 100,
    discountAmount: discountCents / 100,
    totalAmount: (subtotalCents - discountCents) / 100,
    lines: allocatedLines,
  };
}