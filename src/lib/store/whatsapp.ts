import { getWhatsAppUrl } from "@/lib/whatsapp";

export type StoreOrderMessageParams = {
  productName: string;
  color?: string;
  size?: string;
  price?: number;
  currencySymbol?: string;
  productUrl?: string;
  productId?: string;
  whatsappNumber: string;
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
}: Omit<StoreOrderMessageParams, "whatsappNumber">): string {
  const lines = [
    "مرحباً متجر Bayt Ward، أرغب في إتمام طلب هذا المنتج:",
    "",
    `المنتج: ${productName}`,
  ];

  if (color) lines.push(`اللون: ${color}`);
  if (size) lines.push(`المقاس: ${size}`);
  
  if (price !== undefined && currencySymbol) {
    const formattedPrice = price.toLocaleString("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    lines.push(`السعر: ${formattedPrice} ${currencySymbol}`);
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
