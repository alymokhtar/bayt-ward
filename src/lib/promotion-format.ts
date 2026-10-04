import { formatNumber } from "@/lib/utils";
import type { Promotion } from "@/lib/promotions";

export type PromotionOfferDetails = Pick<
  Promotion,
  | "type"
  | "description"
  | "buyQuantity"
  | "getQuantity"
  | "discountPercent"
  | "discountAmount"
  | "minOrderAmount"
>;

function formatAmount(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 2 });
}

export function formatPromotionOfferText(promotion: PromotionOfferDetails): string {
  const customDescription = promotion.description?.trim();
  if (customDescription) return customDescription;

  const minOrderAmount = promotion.minOrderAmount;
  const hasMinimumSpend =
    minOrderAmount != null && Number.isFinite(minOrderAmount) && minOrderAmount > 0;

  if (promotion.type === "PERCENTAGE") {
    const percent = formatAmount(promotion.discountPercent ?? 0);
    return hasMinimumSpend
      ? `خصم ${percent}% عند الشراء بـ ${formatAmount(minOrderAmount)} جنيه أو أكثر`
      : `خصم ${percent}% على السلة`;
  }

  if (promotion.type === "FIXED_AMOUNT") {
    const amount = formatAmount(promotion.discountAmount ?? 0);
    return hasMinimumSpend
      ? `خصم ${amount} جنيه عند الشراء بـ ${formatAmount(minOrderAmount)} جنيه أو أكثر`
      : `خصم ${amount} جنيه على السلة`;
  }

  const benefit = (promotion.discountPercent ?? 100) === 100
    ? "مجاناً"
    : `بخصم ${formatAmount(promotion.discountPercent ?? 100)}%`;
  return `اشتري ${promotion.buyQuantity ?? "—"} واحصلي على ${promotion.getQuantity ?? "—"} ${benefit}`;
}