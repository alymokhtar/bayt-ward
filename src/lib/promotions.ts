import { getCairoDateString, parseCairoCalendarDate } from "@/lib/promotion-date";

export type PromotionType = "BUY_X_GET_Y" | "PERCENTAGE" | "FIXED_AMOUNT";
export type PromotionChannel = "ONLINE" | "POS";

export interface PromotionCalculationOptions {
  channel?: PromotionChannel;
  now?: Date;
}

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
  isStoreOnly?: boolean;
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

export interface CouponDiscount {
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  discountPercent?: number | null;
  discountAmount?: number | null;
  minOrderAmount?: number | null;
}

export function calculateCouponDiscount(
  coupon: CouponDiscount,
  cartSubtotal: number,
): number {
  if (!Number.isFinite(cartSubtotal) || cartSubtotal <= 0) return 0;
  if (
    coupon.minOrderAmount != null &&
    (!Number.isFinite(coupon.minOrderAmount) || cartSubtotal < coupon.minOrderAmount)
  ) {
    return 0;
  }

  if (coupon.type === "PERCENTAGE") {
    if (
      !Number.isFinite(coupon.discountPercent) ||
      coupon.discountPercent! <= 0 ||
      coupon.discountPercent! > 100
    ) {
      return 0;
    }
    return roundMoney(cartSubtotal * coupon.discountPercent! / 100);
  }

  if (!Number.isFinite(coupon.discountAmount) || coupon.discountAmount! <= 0) {
    return 0;
  }
  return roundMoney(Math.min(coupon.discountAmount!, cartSubtotal));
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

function getCalendarDateKey(value: Date | string): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return getCairoDateString(date);
}

export function getPromotionDateRangeBounds(now = new Date()) {
  const today = getCairoDateString(now);
  const dayStart = parseCairoCalendarDate(today);
  const dayEnd = parseCairoCalendarDate(today, true);
  if (!dayStart || !dayEnd) throw new Error("Unable to resolve Cairo date bounds");

  return { dayStart, dayEnd };
}

export function isPromotionDateRangeActive(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  now = new Date(),
): boolean {
  const todayKey = getCairoDateString(now);
  const startKey = startDate == null ? null : getCalendarDateKey(startDate);
  const endKey = endDate == null ? null : getCalendarDateKey(endDate);

  if (startDate != null && startKey == null) return false;
  if (endDate != null && endKey == null) return false;

  return (startKey == null || startKey <= todayKey) && (endKey == null || endKey >= todayKey);
}

function isPromotionActive(promotion: Promotion, now: Date): boolean {
  return promotion.isActive && isPromotionDateRangeActive(
    promotion.startDate,
    promotion.endDate,
    now,
  );
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

interface BuyXGetYDiscount {
  discountValue: number;
  eligibleProductIds: Set<string>;
}

function calculateBuyXGetYDiscount(
  cartItems: CartItem[],
  promotion: Promotion,
): BuyXGetYDiscount {
  const buyQuantity = promotion.buyQuantity;
  const getQuantity = promotion.getQuantity;

  if (
    !Number.isInteger(buyQuantity) ||
    !Number.isInteger(getQuantity) ||
    buyQuantity! <= 0 ||
    getQuantity! <= 0
  ) {
    return { discountValue: 0, eligibleProductIds: new Set() };
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

  if (freeQuantity < 1) return { discountValue: 0, eligibleProductIds: new Set() };

  const discountPercent = promotion.discountPercent ?? 100;
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) {
    return { discountValue: 0, eligibleProductIds: new Set() };
  }

  let remainingFreeQuantity = freeQuantity;
  let discount = 0;

  for (const item of eligibleItems) {
    if (remainingFreeQuantity === 0) break;

    const discountedQuantity = Math.min(item.quantity, remainingFreeQuantity);
    discount += item.unitPrice * discountedQuantity;
    remainingFreeQuantity -= discountedQuantity;
  }

  const discountValue = roundMoney(discount * Math.min(discountPercent, 100) / 100);

  return {
    discountValue,
    eligibleProductIds: discountValue > 0
      ? new Set(eligibleItems.map((item) => item.productId))
      : new Set(),
  };
}

function calculateDirectDiscount(
  promotion: Promotion,
  cartSubtotal: number,
  eligibleItems: CartItem[],
): number {
  const eligibleTotal = eligibleItems.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  if (eligibleTotal <= 0) return 0;

  if (promotion.minOrderAmount != null) {
    const hasSpecificTargets =
      (promotion.products?.length ?? 0) > 0 ||
      (promotion.categories?.length ?? 0) > 0;
    const minimumOrderSubtotal = hasSpecificTargets ? eligibleTotal : cartSubtotal;

    if (
      !Number.isFinite(promotion.minOrderAmount) ||
      minimumOrderSubtotal < promotion.minOrderAmount
    ) {
      return 0;
    }
  }

  if (promotion.type === "PERCENTAGE") {
    const discountPercent = promotion.discountPercent;
    if (!Number.isFinite(discountPercent) || discountPercent! <= 0) return 0;

    return roundMoney(eligibleTotal * Math.min(discountPercent!, 100) / 100);
  }

  const discountAmount = promotion.discountAmount;
  if (!Number.isFinite(discountAmount) || discountAmount! <= 0) return 0;

  return roundMoney(Math.min(discountAmount!, eligibleTotal));
}

export function calculateCartDiscounts(
  cartItems: CartItem[],
  activePromotions: Promotion[],
  options: PromotionCalculationOptions = {},
): DiscountResult {
  const now = options.now ?? new Date();
  const channel = options.channel ?? "ONLINE";

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
  const appliedDiscounts = new Map<string, AppliedPromotion>();

  if (!Number.isFinite(now.getTime())) {
    return {
      originalTotal,
      discountAmount: 0,
      finalTotal: originalTotal,
      appliedPromotions: [],
    };
  }

  const eligiblePromotions = activePromotions.filter((promotion) =>
    isPromotionActive(promotion, now) &&
    (channel === "POS" || !promotion.isStoreOnly),
  );
  const quantityDiscountedProductIds = new Set<string>();

  for (const promotion of eligiblePromotions) {
    if (promotion.type !== "BUY_X_GET_Y") continue;

    const eligibleItems = validCartItems.filter(
      (item) =>
        !quantityDiscountedProductIds.has(item.productId) &&
        matchesPromotion(item, promotion),
    );
    const result = calculateBuyXGetYDiscount(eligibleItems, promotion);

    if (result.discountValue <= 0) continue;

    for (const productId of result.eligibleProductIds) {
      quantityDiscountedProductIds.add(productId);
    }
    appliedDiscounts.set(promotion.id, {
      id: promotion.id,
      title: promotion.title?.trim() || promotion.name,
      discountValue: result.discountValue,
    });
  }

  const exclusiveProductIds = new Set(quantityDiscountedProductIds);
  const pendingDirectPromotions = eligiblePromotions.filter(
    (promotion) => promotion.type !== "BUY_X_GET_Y",
  );

  while (pendingDirectPromotions.length > 0) {
    let bestPromotionIndex = -1;
    let bestEligibleItems: CartItem[] = [];
    let bestDiscountValue = 0;

    for (let index = 0; index < pendingDirectPromotions.length; index++) {
      const promotion = pendingDirectPromotions[index];
      const eligibleItems = validCartItems.filter(
        (item) =>
          !exclusiveProductIds.has(item.productId) &&
          matchesPromotion(item, promotion),
      );
      const discountValue = calculateDirectDiscount(
        promotion,
        originalTotal,
        eligibleItems,
      );

      if (discountValue > bestDiscountValue) {
        bestPromotionIndex = index;
        bestEligibleItems = eligibleItems;
        bestDiscountValue = discountValue;
      }
    }

    if (bestPromotionIndex < 0) break;

    const [promotion] = pendingDirectPromotions.splice(bestPromotionIndex, 1);
    for (const item of bestEligibleItems) {
      exclusiveProductIds.add(item.productId);
    }
    appliedDiscounts.set(promotion.id, {
      id: promotion.id,
      title: promotion.title?.trim() || promotion.name,
      discountValue: bestDiscountValue,
    });
  }

  const appliedPromotions = [...appliedDiscounts.values()];
  const discountAmount = roundMoney(
    Math.min(originalTotal, appliedPromotions.reduce((total, promotion) => total + promotion.discountValue, 0)),
  );
  const finalTotal = roundMoney(Math.max(0, originalTotal - discountAmount));

  return {
    originalTotal,
    discountAmount,
    finalTotal,
    appliedPromotions,
  };
}