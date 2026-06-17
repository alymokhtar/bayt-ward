"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { isCode128Compatible } from "@/lib/barcode";

interface BarcodeLabelProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

export default function BarcodeLabel({
  value,
  width = 1.5,
  height = 40,
  displayValue = true,
  className,
}: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const valid = isCode128Compatible(value);

  useEffect(() => {
    if (!svgRef.current || !value || !valid) return;
    try {
      JsBarcode(svgRef.current, value.trim(), {
        format: "CODE128",
        width,
        height,
        displayValue,
        fontSize: 12,
        margin: 4,
        textAlign: "center",
        textMargin: 2,
        fontOptions: "bold",
        lineColor: "#4B3621",
      });
    } catch {
      // invalid barcode value
    }
  }, [value, width, height, displayValue, valid]);

  if (!valid) {
    return (
      <p className="text-xs text-danger py-2">
        باركود غير صالح للطباعة (استخدم أحرفاً إنجليزية وأرقاماً)
      </p>
    );
  }

  return <svg ref={svgRef} className={className} />;
}
