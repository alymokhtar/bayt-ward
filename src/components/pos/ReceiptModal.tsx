"use client";

import Button from "@/components/ui/Button";
import ReceiptInvoice, { type ReceiptData } from "@/components/pos/ReceiptInvoice";
import { printReceipt } from "@/lib/print-receipt";
import { Printer, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  onClose: () => void;
}

export default function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  const hasAutoPrinted = useRef(false);

  const handlePrint = useCallback(() => {
    if (!receipt) return;
    printReceipt(receipt);
  }, [receipt]);

  useEffect(() => {
    if (!receipt) {
      hasAutoPrinted.current = false;
      return;
    }

    if (hasAutoPrinted.current) return;
    hasAutoPrinted.current = true;

    const timer = window.setTimeout(() => {
      printReceipt(receipt);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [receipt]);

  useEffect(() => {
    if (!receipt) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [receipt, onClose]);

  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-cream shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="font-bold text-brown">فاتورة البيع</h2>
            <p className="text-xs text-muted" dir="ltr">
              {receipt.invoiceNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-brown/5 hover:text-brown"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto bg-white p-4">
          <ReceiptInvoice data={receipt} />
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button className="flex-1" variant="secondary" onClick={onClose}>
            فاتورة جديدة
          </Button>
        </div>
      </div>
    </div>
  );
}
