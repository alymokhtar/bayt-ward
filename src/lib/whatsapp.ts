import { formatCurrency } from "@/lib/utils";

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

export interface LoyaltyPointsWhatsAppMessageParams {
  customerName: string;
  pointsEarned: number;
  pointsBalance: number;
}

export function buildLoyaltyPointsWhatsAppMessage({
  customerName,
  pointsEarned,
  pointsBalance,
}: LoyaltyPointsWhatsAppMessageParams): string {
  return (
    `\u{1F338} *بيت ورد*\n` +
    `أهلاً ${customerName}، شكراً لزيارتك!\n` +
    `اكتسبتِ من مشترياتك اليوم *${pointsEarned} نقطة بيت ورد*.\n` +
    `رصيدك المتاح الآن *${pointsBalance} نقطة*.\n` +
    `\u{1F4CC} *تنويه:* يمكنك استبدال النقاط بخصم مباشر عند وصول رصيدك إلى 50 نقطة فأكثر.\n` +
    `سعداء بخدمتك دائماً \u{1F495} — بيت ورد`
  );
}

export function formatPhoneForWhatsApp(phone: string): string {
  const trimmedPhone = phone?.trim() || "";
  if (!trimmedPhone) return "";
  if (
    /[^0-9٠-٩۰-۹+().,\s/-]/.test(trimmedPhone) ||
    (trimmedPhone.match(/\+/g)?.length ?? 0) > 1 ||
    (trimmedPhone.includes("+") && !trimmedPhone.startsWith("+"))
  ) {
    return "";
  }

  let cleaned = Array.from(trimmedPhone, (character) => {
    const codePoint = character.codePointAt(0)!;
    if (codePoint >= 0x0660 && codePoint <= 0x0669) {
      return String(codePoint - 0x0660);
    }
    if (codePoint >= 0x06f0 && codePoint <= 0x06f9) {
      return String(codePoint - 0x06f0);
    }
    return character;
  })
    .join("")
    .replace(/\D/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }

  const egyptianMobile = /^(?:10|11|12|15)\d{8}$/;
  if (/^0(?:10|11|12|15)\d{8}$/.test(cleaned)) {
    cleaned = `20${cleaned.slice(1)}`;
  } else if (egyptianMobile.test(cleaned)) {
    cleaned = `20${cleaned}`;
  } else if (cleaned.startsWith("20")) {
    if (!/^20(?:10|11|12|15)\d{8}$/.test(cleaned)) return "";
  } else if (cleaned.length < 8 || cleaned.length > 15 || cleaned.startsWith("0")) {
    return "";
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
        `💰 *الإجمالي:* ${formatCurrency(params.totalAmount ?? 0, currency)}\n` +
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
  if (!formattedPhone) return "";
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

export function openWhatsApp(phone: string, message: string): void {
  if (typeof window === "undefined") return;
  const url = getWhatsAppUrl(phone, message);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}
