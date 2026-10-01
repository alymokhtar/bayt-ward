export type PromotionType = "BUY_X_GET_Y" | "PERCENTAGE" | "FIXED_AMOUNT";

export interface CartItem {
  productId: string;
  variantId?: string | null;
  categoryId?: string | null;
  unitPrice: number;
  quantity: number;
  name: string;
  image?: string | null;
}

export type PromotionTarget = string | { id: string };

export interface Promotion {
  id: string;
  name: string;
  description?: string | null;
  title?: string | null;
  type: PromotionType;
  isActive: boolean;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  discountPercent?: number | null;
  discountAmount?: number | null;
  minOrderAmount?: number | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  products?: readonly PromotionTarget[];
  categories?: readonly PromotionTarget[];
}

export interface AppliedPromotion {
  id: string;
  title: string;
  discountValue: number;
}

export interface DiscountResult {
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
  appliedPromotions: AppliedPromotion[];
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDate(value: Date | string): number | null {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isPromotionActive(promotion: Promotion, now: number): boolean {
  if (!promotion.isActive) return false;

  if (promotion.startDate != null) {
    const startDate = parseDate(promotion.startDate);
    if (startDate === null || startDate > now) return false;
  }

  if (promotion.endDate != null) {
    const endDate = parseDate(promotion.endDate);
    if (endDate === null || endDate < now) return false;
  }

  return true;
}

function getTargetId(target: PromotionTarget): string {
  return typeof target === "string" ? target : target.id;
}

function matchesPromotion(item: CartItem, promotion: Promotion): boolean {
  const productIds = new Set((promotion.products ?? []).map(getTargetId));
  const categoryIds = new Set((promotion.categories ?? []).map(getTargetId));

  if (productIds.size === 0 && categoryIds.size === 0) return true;

  return (
    productIds.has(item.productId) ||
    (item.categoryId != null && categoryIds.has(item.categoryId))
  );
}

function calculateBuyXGetYDiscount(
  cartItems: CartItem[],
  promotion: Promotion,
): number {
  const buyQuantity = promotion.buyQuantity;
  const getQuantity = promotion.getQuantity;

  if (
    !Number.isInteger(buyQuantity) ||
    !Number.isInteger(getQuantity) ||
    buyQuantity! <= 0 ||
    getQuantity! <= 0
  ) {
    return 0;
  }

  const eligibleItems = cartItems
    .filter((item) => matchesPromotion(item, promotion))
    .sort((first, second) => first.unitPrice - second.unitPrice);
  const eligibleQuantity = eligibleItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const groupSize = buyQuantity! + getQuantity!;
  const freeQuantity = Math.floor(eligibleQuantity / groupSize) * getQuantity!;

  if (freeQuantity < 1) return 0;

  const discountPercent = promotion.discountPercent ?? 100;
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) return 0;

  let remainingFreeQuantity = freeQuantity;
  let discount = 0;

  for (const item of eligibleItems) {
    if (remainingFreeQuantity === 0) break;

    const discountedQuantity = Math.min(item.quantity, remainingFreeQuantity);
    discount += item.unitPrice * discountedQuantity;
    remainingFreeQuantity -= discountedQuantity;
  }

  return roundMoney(discount * Math.min(discountPercent, 100) / 100);
}

function calculateDirectDiscount(
  promotion: Promotion,
  originalTotal: number,
  remainingTotal: number,
): number {
  if (promotion.minOrderAmount != null) {
    if (
      !Number.isFinite(promotion.minOrderAmount) ||
      originalTotal < promotion.minOrderAmount
    ) {
      return 0;
    }
  }

  if (promotion.type === "PERCENTAGE") {
    const discountPercent = promotion.discountPercent;
    if (!Number.isFinite(discountPercent) || discountPercent! <= 0) return 0;

    return roundMoney(remainingTotal * Math.min(discountPercent!, 100) / 100);
  }

  const discountAmount = promotion.discountAmount;
  if (!Number.isFinite(discountAmount) || discountAmount! <= 0) return 0;

  return roundMoney(Math.min(discountAmount!, remainingTotal));
}

export function calculateCartDiscounts(
  cartItems: CartItem[],
  activePromotions: Promotion[],
  now: Date = new Date(),
): DiscountResult {
  const nowTimestamp = now.getTime();
  const validCartItems = cartItems.flatMap((item) => {
    if (
      !Number.isFinite(item.unitPrice) ||
      item.unitPrice < 0 ||
      !Number.isFinite(item.quantity) ||
      item.quantity < 1
    ) {
      return [];
    }

    const quantity = Math.floor(item.quantity);
    if (quantity < 1 || !Number.isFinite(item.unitPrice * quantity)) return [];

    return [{ ...item, quantity }];
  });

  const originalTotal = roundMoney(
    validCartItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
  );
  let remainingTotal = originalTotal;
  const appliedPromotions: AppliedPromotion[] = [];

  if (!Number.isFinite(nowTimestamp)) {
    return { originalTotal, discountAmount: 0, finalTotal: originalTotal, appliedPromotions };
  }

  for (const promotion of activePromotions) {
    if (!isPromotionActive(promotion, nowTimestamp) || remainingTotal <= 0) continue;

    const proposedDiscount =
      promotion.type === "BUY_X_GET_Y"
        ? calculateBuyXGetYDiscount(validCartItems, promotion)
        : calculateDirectDiscount(promotion, originalTotal, remainingTotal);
    const discountValue = roundMoney(Math.min(proposedDiscount, remainingTotal));

    if (discountValue <= 0) continue;

    remainingTotal = roundMoney(Math.max(0, remainingTotal - discountValue));
    appliedPromotions.push({
      id: promotion.id,
      title: promotion.title?.trim() || promotion.name,
      discountValue,
    });
  }

  return {
    originalTotal,
    discountAmount: roundMoney(originalTotal - remainingTotal),
    finalTotal: remainingTotal,
    appliedPromotions,
  };
}