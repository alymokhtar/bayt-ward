export type WhatsAppMessageType =
  | "sale_receipt"
  | "promotion"
  | "thank_you"
  | "custom";

export interface WhatsAppMessageParams {
  storeName?: string;
  storeNameAr?: string;
  customerName?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  currencySymbol?: string;
  items?: string;
  promotionText?: string;
  customMessage?: string;
}

function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = `20${cleaned.slice(1)}`;
  }
  if (!cleaned.startsWith("20") && cleaned.length <= 11) {
    cleaned = `20${cleaned}`;
  }
  return cleaned;
}

export function buildWhatsAppMessage(
  type: WhatsAppMessageType,
  params: WhatsAppMessageParams
): string {
  const store = params.storeNameAr || params.storeName || "بيت ورد";
  const currency = params.currencySymbol || "ج.م";
  const name = params.customerName || "عزيزتنا";

  switch (type) {
    case "sale_receipt":
      return (
        `🌸 *${store}*\n\n` +
        `مرحباً ${name} 👋\n\n` +
        `شكراً لتسوقك معنا!\n\n` +
        `📋 *فاتورة:* ${params.invoiceNumber || "—"}\n` +
        `💰 *الإجمالي:* ${params.totalAmount?.toLocaleString("ar-EG")} ${currency}\n` +
        (params.items ? `\n🛍️ *التفاصيل:*\n${params.items}\n` : "") +
        `\nنتمنى لكِ يوماً سعيداً 💕\n` +
        `— ${store}`
      );

    case "promotion":
      return (
        `🌸 *${store}*\n\n` +
        `مرحباً ${name} 👋\n\n` +
        `${params.promotionText || "عرض خاص لعملائنا الكرام!"}\n\n` +
        `زورينا اليوم واستمتعي بأحدث تشكيلاتنا ✨\n` +
        `— ${store}`
      );

    case "thank_you":
      return (
        `🌸 *${store}*\n\n` +
        `مرحباً ${name} 👋\n\n` +
        `نشتاق إليكِ! 💕\n` +
        `لدينا تشكيلات جديدة في انتظارك.\n\n` +
        `زورينا قريباً ✨\n` +
        `— ${store}`
      );

    case "custom":
      return params.customMessage || `مرحباً ${name} 👋\n\n— ${store}`;

    default:
      return params.customMessage || "";
  }
}

export function getWhatsAppUrl(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

export function openWhatsApp(phone: string, message: string): void {
  if (typeof window === "undefined") return;
  window.open(getWhatsAppUrl(phone, message), "_blank", "noopener,noreferrer");
}
