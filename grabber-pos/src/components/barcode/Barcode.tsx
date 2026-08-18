"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  height?: number;
  width?: number;
}

/** Renders a CODE128 barcode into an inline SVG (print-friendly). */
export function Barcode({ value, height = 38, width = 1.4 }: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        width,
        height,
        fontSize: 11,
        margin: 0,
        displayValue: true,
      });
    } catch {
      // Invalid value for CODE128 — leave the SVG empty.
    }
  }, [value, height, width]);

  return <svg ref={ref} className="max-w-full" />;
}
