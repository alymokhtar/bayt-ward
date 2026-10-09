"use client";

import { useRef, useState } from "react";
import { getStoreOrderWhatsAppUrl } from "@/lib/store/whatsapp";

type WhatsAppOrderButtonProps = {
  productName: string;
  productUrl: string;
  productId?: string;
  whatsappNumber: string;
  quantity?: number;
  color?: string;
  size?: string;
  sku?: string;
  variantId?: string;
  price?: number;
  discountAmount?: number;
  savingsPercent?: number;
  finalTotal?: number;
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
  sku,
  variantId,
  price,
  discountAmount,
  savingsPercent,
  finalTotal,
  currencySymbol,
  disabled = false,
  className = "",
}: WhatsAppOrderButtonProps) {
  const openingRef = useRef(false);
  const [isOpening, setIsOpening] = useState(false);
  const [openError, setOpenError] = useState("");

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
    sku,
    variantId,
    price,
    discountAmount,
    savingsPercent,
    finalTotal,
    currencySymbol,
  });

  function handleOrderClick() {
    if (openingRef.current || disabled) return;
    openingRef.current = true;
    setIsOpening(true);
    setOpenError("");

    let orderWindow: Window | null = null;
    try {
      orderWindow = window.open("about:blank", "_blank");
      if (!orderWindow) {
        setOpenError("تعذر فتح واتساب. اسمحي بالنوافذ المنبثقة ثم حاولي مرة أخرى.");
        openingRef.current = false;
        setIsOpening(false);
        return;
      }
      orderWindow.opener = null;
      orderWindow.location.href = href;
    } catch (error) {
      console.error("Unable to open the WhatsApp product order link.", error);
      orderWindow?.close();
      setOpenError("تعذر فتح رابط واتساب. حاولي مرة أخرى.");
      openingRef.current = false;
      setIsOpening(false);
      return;
    }

    window.setTimeout(() => {
      openingRef.current = false;
      setIsOpening(false);
    }, 1500);
  }

  return (
    <button
      type="button"
      onClick={handleOrderClick}
      disabled={disabled || isOpening}
      aria-disabled={disabled || isOpening}
      dir="rtl"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3.5 text-sm font-medium text-white transition hover:bg-[#1da851] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span aria-hidden="true" className="shrink-0">💬</span>
      <span className="whitespace-nowrap text-center">
        {isOpening
          ? "جارٍ فتح واتساب..."
          : openError || "اطلبي عبر واتساب"}
      </span>
      {openError && <span className="sr-only" role="alert">{openError}</span>}
    </button>
  );
}
