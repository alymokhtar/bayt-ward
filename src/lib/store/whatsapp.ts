import { getWhatsAppUrl } from "@/lib/whatsapp";

export type StoreOrderMessageParams = {
  productName: string;
  color?: string;
  size?: string;
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

export function buildStoreOrderMessage({
  productName,
  color,
  size,
  productUrl,
  productId,
}: Omit<StoreOrderMessageParams, "whatsappNumber">): string {
  const lines = [
    "مرحبا بيت ورد",
    "أرغب في طلب المنتج:",
    productName,
  ];

  if (color) lines.push(`اللون: ${color}`);
  if (size) lines.push(`المقاس: ${size}`);

  const productLink = getStoreProductLink(productUrl, productId);
  if (productLink) {
    lines.push(`الرابط: ${productLink}`);
  }

  return lines.join("\n");
}

export function getStoreOrderWhatsAppUrl(params: StoreOrderMessageParams): string {
  const message = buildStoreOrderMessage(params);
  return getWhatsAppUrl(params.whatsappNumber, message);
}
