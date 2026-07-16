import { getWhatsAppUrl } from "@/lib/whatsapp";

export type StoreOrderMessageParams = {
  productName: string;
  color?: string;
  size?: string;
  productUrl: string;
  whatsappNumber: string;
};

export function buildStoreOrderMessage({
  productName,
  color,
  size,
  productUrl,
}: Omit<StoreOrderMessageParams, "whatsappNumber">): string {
  const lines = [
    "السلام عليكم.",
    "أرغب في طلب المنتج:",
    productName,
  ];

  if (color) lines.push(`اللون: ${color}`);
  if (size) lines.push(`المقاس: ${size}`);
  lines.push(`رابط المنتج: ${productUrl}`);

  return lines.join("\n");
}

export function getStoreOrderWhatsAppUrl(params: StoreOrderMessageParams): string {
  const message = buildStoreOrderMessage(params);
  return getWhatsAppUrl(params.whatsappNumber, message);
}
