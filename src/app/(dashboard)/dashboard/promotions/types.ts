export const PROMOTION_TYPES = {
  BUY_X_GET_Y: "BUY_X_GET_Y",
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
} as const;

export type PromotionType = (typeof PROMOTION_TYPES)[keyof typeof PROMOTION_TYPES];
export type PromotionView = "current" | "expired";

export interface PromotionInput {
  name: string;
  description: string;
  type: PromotionType;
  buyQuantity: number | null;
  getQuantity: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
  minOrderAmount: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isStoreOnly: boolean;
  categoryIds: string[];
  productIds: string[];
}

export interface PromotionRecord {
  id: string;
  name: string;
  description: string | null;
  type: PromotionType;
  buyQuantity: number | null;
  getQuantity: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
  minOrderAmount: number | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  isStoreOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
}

export interface PromotionFormOptions {
  categories: { id: string; name: string }[];
  products: { id: string; name: string; categoryId: string; skus: string[] }[];
}

export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface CouponInput {
  code: string;
  type: CouponType;
  discountPercent: number | null;
  discountAmount: number | null;
  minOrderAmount: number | null;
  usageLimit: number | null;
  expiresAt: string;
  isActive: boolean;
  stackable: boolean;
}

export interface CouponRecord {
  id: string;
  code: string;
  type: CouponType;
  discountPercent: number | null;
  discountAmount: number | null;
  minOrderAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  stackable: boolean;
  createdAt: Date;
  updatedAt: Date;
}