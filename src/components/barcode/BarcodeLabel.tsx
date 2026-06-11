"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

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

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
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
  }, [value, width, height, displayValue]);

  return <svg ref={svgRef} className={className} />;
}
