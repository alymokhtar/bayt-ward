export const PROMOTION_TYPES = {
  BUY_X_GET_Y: "BUY_X_GET_Y",
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
} as const;

export type PromotionType = (typeof PROMOTION_TYPES)[keyof typeof PROMOTION_TYPES];

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
  createdAt: Date;
  updatedAt: Date;
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
}

export interface PromotionFormOptions {
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
}