"use client";

import Button from "@/components/ui/Button";
import ExchangeReceiptInvoice, {
  type ExchangeReceiptData,
} from "@/components/pos/ExchangeReceiptInvoice";
import { printExchangeReceipt } from "@/lib/print-exchange-receipt";
import { Printer, X } from "lucide-react";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";

interface ExchangeReceiptModalProps {
  receipt: ExchangeReceiptData | null;
  onClose: () => void;
}

type PrintNotice = {
  receipt: ExchangeReceiptData;
  message: string;
};

class ExchangeReceiptErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Failed to render exchange receipt:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-cream p-6 text-center shadow-xl">
          <p className="mb-4 text-sm text-brown">
            تم حفظ الاستبدال، لكن تعذرت معاينة فاتورته. يمكنك إعادة المحاولة أو إعادة الطباعة لاحقاً.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => this.setState({ hasError: false })}>
              إعادة المحاولة
            </Button>
            <Button variant="secondary" onClick={this.props.onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

function ExchangeReceiptModalContent({
  receipt,
  onClose,
}: ExchangeReceiptModalProps) {
  const hasAutoPrinted = useRef(false);
  const [printNotice, setPrintNotice] = useState<PrintNotice | null>(null);

  const handlePrint = useCallback(() => {
    if (!receipt) return;
    try {
      const opened = printExchangeReceipt(receipt);
      setPrintNotice(opened
        ? null
        : {
            receipt,
            message: "تعذر فتح نافذة الطباعة تلقائياً. اسمح بالنوافذ المنبثقة أو استخدم زر الطباعة.",
          });
    } catch (error) {
      console.error("Failed to print exchange receipt:", error);
      setPrintNotice({
        receipt,
        message: "تعذرت الطباعة الآن. يمكنك المحاولة مرة أخرى من زر الطباعة.",
      });
    }
  }, [receipt]);

  useEffect(() => {
    if (!receipt) {
      hasAutoPrinted.current = false;
      return;
    }

    if (hasAutoPrinted.current) return;
    hasAutoPrinted.current = true;
    const timer = window.setTimeout(handlePrint, 350);

    return () => window.clearTimeout(timer);
  }, [handlePrint, receipt]);

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-cream shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="font-bold text-brown">فاتورة الاستبدال</h2>
            <p className="text-xs text-muted" dir="ltr">{receipt.exchangeNumber}</p>
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
          <ExchangeReceiptInvoice data={receipt} />
        </div>

        {printNotice?.receipt === receipt && (
          <p role="status" className="px-4 pt-3 text-sm text-amber-800">
            {printNotice.message}
          </p>
        )}

        <div className="flex gap-2 border-t border-border p-4">
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button className="flex-1" variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ExchangeReceiptModal(props: ExchangeReceiptModalProps) {
  if (!props.receipt) return null;

  return (
    <ExchangeReceiptErrorBoundary onClose={props.onClose}>
      <ExchangeReceiptModalContent {...props} />
    </ExchangeReceiptErrorBoundary>
  );
}
