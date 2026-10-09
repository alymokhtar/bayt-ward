import { getWhatsAppUrl } from "@/lib/whatsapp";

export type StoreOrderMessageParams = {
  productName: string;
  color?: string;
  size?: string;
  price?: number;
  discountAmount?: number;
  savingsPercent?: number;
  finalTotal?: number;
  currencySymbol?: string;
  productUrl?: string;
  productId?: string;
  whatsappNumber: string;
  quantity?: number;
};

function getStoreProductLink(productUrl?: string, productId?: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return productId ? `${window.location.origin}/store/product/${productId}` : productUrl || "";
  }

  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SITE_URL) {
    return productId ? `${process.env.NEXT_PUBLIC_SITE_URL}/store/product/${productId}` : productUrl || "";
  }

  if (productUrl) {
    return productUrl;
  }

  if (productId) {
    return `/store/product/${productId}`;
  }

  return "";
}

function appendProductQueryParams(productLink: string, color?: string, size?: string): string {
  if (!productLink) return "";

  const [basePath, existingQuery = ""] = productLink.split("?");
  const params = new URLSearchParams(existingQuery);

  if (color) {
    params.set("color", color);
    params.set("variant", color);
  }

  if (size) {
    params.set("size", size);
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export {
  appendProductQueryParams,
};

export function buildStoreOrderMessage({
  productName,
  color,
  size,
  price,
  currencySymbol,
  productUrl,
  productId,
  quantity,
  discountAmount,
  savingsPercent,
  finalTotal,
}: Omit<StoreOrderMessageParams, "whatsappNumber">): string {
  const lines = [
    "مرحباً متجر Bayt Ward، أرغب في إتمام طلب هذا المنتج:",
    "",
    `المنتج: ${productName}`,
  ];

  if (color) lines.push(`اللون: ${color}`);
  if (size) lines.push(`المقاس: ${size}`);
  if (quantity !== undefined) lines.push(`الكمية: ${quantity}`);
  
  if (price !== undefined && currencySymbol) {
    const originalTotal = price * (quantity ?? 1);
    lines.push(`سعر الوحدة قبل الخصم: ${formatAmount(price)} ${currencySymbol}`);
    lines.push(`المجموع قبل الخصم: ${formatAmount(originalTotal)} ${currencySymbol}`);
    if (discountAmount !== undefined && discountAmount > 0) {
      lines.push(`الخصم المطبق: - ${formatAmount(discountAmount)} ${currencySymbol}`);
    }
    if (savingsPercent !== undefined && savingsPercent > 0) {
      lines.push(`نسبة التوفير: ${formatAmount(savingsPercent)}%`);
    }
    lines.push(
      `الإجمالي بعد الخصم: ${formatAmount(finalTotal ?? originalTotal - (discountAmount ?? 0))} ${currencySymbol}`,
    );
  }

  const productLink = getStoreProductLink(productUrl, productId);
  if (productLink) {
    lines.push(`الرابط: ${appendProductQueryParams(productLink, color, size)}`);
  }

  return lines.join("\n");
}

export function getStoreOrderWhatsAppUrl(params: StoreOrderMessageParams): string {
  const message = buildStoreOrderMessage(params);
  return getWhatsAppUrl(params.whatsappNumber, message);
}

export type StoreCartOrderItem = {
  productName: string;
  productUrl: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  currencySymbol: string;
  promotionNotices?: string[];
};

export type StoreCartOrderSummary = {
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  appliedPromotions: { title: string; discountValue: number }[];
  currencySymbol: string;
};

export function buildStoreCartOrderMessage(
  items: StoreCartOrderItem[],
  summary: StoreCartOrderSummary,
): string {
  const lines = [
    "مرحباً متجر Bayt Ward، أرغب في إتمام طلب هذه المنتجات:",
    "",
    ...items.flatMap((item) => [
      `المنتج: ${item.productName}`,
      ...(item.color ? [`اللون: ${item.color}`] : []),
      ...(item.size ? [`المقاس: ${item.size}`] : []),
      `الكمية: ${item.quantity}`,
      `السعر: ${formatAmount(item.unitPrice * item.quantity)} ${item.currencySymbol}`,
      ...(item.promotionNotices ?? []),
      `الرابط: ${item.productUrl}`,
      "",
    ]),
    `المجموع الفرعي: ${formatAmount(summary.subtotal)} ${summary.currencySymbol}`,
    ...summary.appliedPromotions.flatMap((promotion) => [
      `العرض: ${promotion.title}`,
      `الخصم: - ${formatAmount(promotion.discountValue)} ${summary.currencySymbol}`,
    ]),
    ...(summary.discountAmount > 0
      ? [
          `إجمالي الخصم: - ${formatAmount(summary.discountAmount)} ${summary.currencySymbol}`,
          ...(summary.subtotal > 0
            ? [`نسبة التوفير: ${formatAmount(summary.discountAmount / summary.subtotal * 100)}%`]
            : []),
        ]
      : []),
    `الإجمالي بعد الخصم: ${formatAmount(summary.finalTotal)} ${summary.currencySymbol}`,
  ];

  return lines.join("\n");
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
