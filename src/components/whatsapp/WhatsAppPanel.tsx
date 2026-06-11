"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  buildWhatsAppMessage,
  openWhatsApp,
  type WhatsAppMessageType,
} from "@/lib/whatsapp";
import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";

interface CustomerForWhatsApp {
  id: string;
  name: string;
  phone: string;
}

interface WhatsAppPanelProps {
  customers: CustomerForWhatsApp[];
  storeNameAr?: string;
  defaultPromotion?: string;
}

const messageTypes: { value: WhatsAppMessageType; label: string }[] = [
  { value: "promotion", label: "عرض ترويجي" },
  { value: "thank_you", label: "رسالة شكر وتذكير" },
  { value: "custom", label: "رسالة مخصصة" },
];

export default function WhatsAppPanel({
  customers,
  storeNameAr = "بيت ورد",
  defaultPromotion = "",
}: WhatsAppPanelProps) {
  const [messageType, setMessageType] =
    useState<WhatsAppMessageType>("promotion");
  const [promotionText, setPromotionText] = useState(defaultPromotion);
  const [customMessage, setCustomMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  function toggleCustomer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    }
  }

  function buildMessageForCustomer(customerName: string): string {
    return buildWhatsAppMessage(messageType, {
      storeNameAr,
      customerName,
      promotionText,
      customMessage,
    });
  }

  function sendToCustomer(customer: CustomerForWhatsApp) {
    const message = buildMessageForCustomer(customer.name);
    openWhatsApp(customer.phone, message);
  }

  function sendToSelected() {
    const selected = customers.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;

    setSending(true);
    selected.forEach((customer, index) => {
      setTimeout(() => {
        sendToCustomer(customer);
        if (index === selected.length - 1) setSending(false);
      }, index * 800);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
          إرسال رسائل واتساب
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {messageTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setMessageType(type.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                messageType === type.value
                  ? "bg-[#25D366] text-white border-[#25D366]"
                  : "border-border hover:bg-cream-dark/50"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {messageType === "promotion" && (
          <Input
            label="نص العرض"
            value={promotionText}
            onChange={(e) => setPromotionText(e.target.value)}
            placeholder="خصم 20% على جميع الفساتين هذا الأسبوع!"
          />
        )}

        {messageType === "custom" && (
          <div>
            <label className="block text-sm font-medium text-brown mb-1.5">
              الرسالة
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
              placeholder="اكتبي رسالتك هنا..."
            />
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-brown">
              العملاء ({selectedIds.size} محدد)
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedIds.size === customers.length
                  ? "إلغاء الكل"
                  : "تحديد الكل"}
              </Button>
              <Button
                size="sm"
                onClick={sendToSelected}
                loading={sending}
                disabled={selectedIds.size === 0}
                className="bg-[#25D366] hover:bg-[#20BD5A] text-white border-none"
              >
                <Send className="h-4 w-4" />
                إرسال للمحددين
              </Button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(customer.id)}
                  onChange={() => toggleCustomer(customer.id)}
                  className="h-4 w-4 accent-gold"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  <p className="text-xs text-muted" dir="ltr">
                    {customer.phone}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => sendToCustomer(customer)}
                >
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
