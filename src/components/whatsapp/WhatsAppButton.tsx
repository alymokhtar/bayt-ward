"use client";

import Button from "@/components/ui/Button";
import { openWhatsApp } from "@/lib/whatsapp";
import { MessageCircle } from "lucide-react";

interface WhatsAppButtonProps {
  phone: string;
  message: string;
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
}

export default function WhatsAppButton({
  phone,
  message,
  label = "واتساب",
  variant = "outline",
  size = "sm",
  className,
}: WhatsAppButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-1.5 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10 ${className || ""}`}
      onClick={() => openWhatsApp(phone, message)}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </Button>
  );
}
