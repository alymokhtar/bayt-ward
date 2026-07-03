"use client";

import Button from "@/components/ui/Button";
import { Printer } from "lucide-react";
import { useCallback, useRef } from "react";

export function usePrintInvoice() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const printInvoice = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Create hidden iframe for isolated printing
    let iframe = iframeRef.current;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Get computed styles from parent document
    const parentStyles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          return "";
        }
      })
      .join("\n");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>فاتورة</title>
        <style>
          ${parentStyles}
          @media print {
            body { margin: 0; padding: 16px; background: white; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body { font-family: system-ui, -apple-system, sans-serif; background: white; }
          .print-only { display: block; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
      </html>
    `);
    doc.close();

    // Wait for styles to load then print
    setTimeout(() => {
      iframe?.contentWindow?.print();
    }, 250);
  }, []);

  return printInvoice;
}

interface PrintInvoiceButtonProps {
  invoiceId: string;
}

export default function PrintInvoiceButton({ invoiceId }: PrintInvoiceButtonProps) {
  const printInvoice = usePrintInvoice();

  return (
    <Button variant="outline" onClick={() => printInvoice(invoiceId)}>
      <Printer className="h-4 w-4" />
      طباعة
    </Button>
  );
}
