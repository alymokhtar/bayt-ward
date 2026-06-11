"use client";

import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import { buildWhatsAppMessage } from "@/lib/whatsapp";
import { formatCurrency } from "@/lib/utils";

interface SaleWhatsAppButtonProps {
  customerName: string;
  customerPhone: string;
  invoiceNumber: string;
  totalAmount: number;
  currencySymbol?: string;
  storeNameAr?: string;
  items?: string;
}

export default function SaleWhatsAppButton({
  customerName,
  customerPhone,
  invoiceNumber,
  totalAmount,
  currencySymbol = "ج.م",
  storeNameAr = "بيت ورد",
  items,
}: SaleWhatsAppButtonProps) {
  const message = buildWhatsAppMessage("sale_receipt", {
    storeNameAr,
    customerName,
    invoiceNumber,
    totalAmount,
    currencySymbol,
    items,
  });

  return (
    <WhatsAppButton
      phone={customerPhone}
      message={message}
      label="إرسال الفاتورة عبر واتساب"
    />
  );
}
