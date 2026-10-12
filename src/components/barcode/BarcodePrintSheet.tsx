"use client";

import Button from "@/components/ui/Button";
import { formatBarcodeLabelPrice } from "@/lib/barcode";
import { Printer } from "lucide-react";
import { useMemo } from "react";
import BarcodeLabel from "./BarcodeLabel";

export interface LabelData {
  id: string;
  sku: string;
  barcode: string;
  productName: string;
  brand?: string | null;
  size: string;
  color: string;
  price: number;
  quantity: number;
}

interface BarcodePrintSheetProps {
  labels: LabelData[];
}

export default function BarcodePrintSheet({ labels }: BarcodePrintSheetProps) {
  const expandedLabels = useMemo(
    () =>
      labels.flatMap((label) =>
        Array.from({ length: label.quantity }, (_, i) => ({
          ...label,
          key: `${label.id}-${i}`,
          priceDisplay: formatBarcodeLabelPrice(label.price),
        }))
      ),
    [labels]
  );

  function handlePrint() {
    window.print();
  }

  if (expandedLabels.length === 0) {
    return (
      <p className="text-center text-muted py-8">
        اختر منتجات لطباعة الباركود
      </p>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4 no-print">
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          طباعة {expandedLabels.length} ملصق
        </Button>
      </div>

      <div className="barcode-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {expandedLabels.map((label) => (
          <div
            key={label.key}
            className="barcode-label border border-border rounded-lg p-1 bg-white text-center break-inside-avoid"
          >
            <p className="text-[9px] font-bold text-brown truncate mb-0.5">
              {label.productName}
            </p>
            {label.brand?.trim() && (
              <p className="truncate text-[7px] text-muted mb-0.5">
                {label.brand.trim()}
              </p>
            )}
            <p className="text-[7px] text-muted mb-0.5">
              {label.size} · {label.color}
            </p>
            <div className="flex min-h-0 justify-center">
              <BarcodeLabel
                value={label.barcode || label.sku}
                className="barcode-svg"
              />
            </div>
            <p
              className="text-[9px] font-bold text-brown font-mono tracking-wider"
              dir="ltr"
            >
              {label.priceDisplay}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
