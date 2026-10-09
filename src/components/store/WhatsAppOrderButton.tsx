"use client";

import { getStoreOrderWhatsAppUrl } from "@/lib/store/whatsapp";

type WhatsAppOrderButtonProps = {
  productName: string;
  productUrl: string;
  productId?: string;
  whatsappNumber: string;
  quantity?: number;
  color?: string;
  size?: string;
  price?: number;
  currencySymbol?: string;
  disabled?: boolean;
  className?: string;
};

export default function WhatsAppOrderButton({
  productName,
  productUrl,
  productId,
  whatsappNumber,
  quantity,
  color,
  size,
  price,
  currencySymbol,
  disabled = false,
  className = "",
}: WhatsAppOrderButtonProps) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`inline-flex w-full cursor-not-allowed items-center justify-center rounded-full bg-[var(--store-text)] px-6 py-3.5 text-sm font-medium text-white opacity-50 ${className}`}
      >
        غير متوفر حالياً
      </button>
    );
  }

  if (!whatsappNumber) {
    return (
      <a
        href="/store/contact"
        className={`inline-flex w-full items-center justify-center rounded-full bg-[var(--store-text)] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-black ${className}`}
      >
        تواصل معنا للطلب
      </a>
    );
  }

  const href = getStoreOrderWhatsAppUrl({
    productName,
    productUrl,
    productId,
    whatsappNumber,
    quantity,
    color,
    size,
    price,
    currencySymbol,
  });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={disabled}
      dir="rtl"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3.5 text-sm font-medium text-white transition hover:bg-[#1da851] disabled:opacity-50 ${className}`}
    >
      <span aria-hidden="true" className="shrink-0">💬</span>
      <span className="whitespace-nowrap text-center">اطلبي عبر واتساب</span>
    </a>
  );
}
