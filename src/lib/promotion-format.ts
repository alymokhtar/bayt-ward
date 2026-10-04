import { formatNumber } from "@/lib/utils";
import type { CartItem, Promotion, PromotionTarget } from "@/lib/promotions";

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

function targetId(target: PromotionTarget): string {
  return typeof target === "string" ? target : target.id;
}

export function getStoreOnlyPromotionNotices(
  item: Pick<CartItem, "productId" | "categoryId" | "name">,
  promotions: Promotion[],
): string[] {
  return promotions
    .filter((promotion) => {
      if (!promotion.isStoreOnly) return false;

      const productTargets = promotion.products ?? [];
      const categoryTargets = promotion.categories ?? [];
      if (productTargets.length === 0 && categoryTargets.length === 0) return true;

      return (
        productTargets.some((target) => targetId(target) === item.productId) ||
        (item.categoryId != null &&
          categoryTargets.some((target) => targetId(target) === item.categoryId))
      );
    })
    .map((promotion) =>
      `📍 ملاحظة: هذا المنتج (${item.name}) يتوفر عليه ${formatPromotionOfferText(promotion)} حصرياً عند الشراء من داخل فرع بيت ورد. نتشرف بزيارتكم للاستفادة من العرض!`,
    );
}