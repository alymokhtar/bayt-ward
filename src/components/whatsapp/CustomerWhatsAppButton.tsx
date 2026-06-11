"use client";

import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import { buildWhatsAppMessage } from "@/lib/whatsapp";

interface CustomerWhatsAppButtonProps {
  customerName: string;
  customerPhone: string;
  storeNameAr?: string;
  type?: "thank_you" | "promotion";
  promotionText?: string;
}

export default function CustomerWhatsAppButton({
  customerName,
  customerPhone,
  storeNameAr = "بيت ورد",
  type = "thank_you",
  promotionText,
}: CustomerWhatsAppButtonProps) {
  const message = buildWhatsAppMessage(type, {
    storeNameAr,
    customerName,
    promotionText,
  });

  return (
    <WhatsAppButton
      phone={customerPhone}
      message={message}
      label=""
      size="icon"
      variant="ghost"
    />
  );
}
