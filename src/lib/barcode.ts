/** Internal store barcodes use CODE128 (alphanumeric). */

import { formatBarcode, parseVariantCodeNumber } from "@/lib/variant-codes";

const CODE128_PATTERN = /^[\x00-\x7F]+$/;

export function normalizeScanCode(code: string): string {
  return code.trim().replace(/\r?\n/g, "");
}

/** Value encoded on printed labels — barcode field or SKU fallback. */
export function getBarcodeValue(
  barcode: string | null | undefined,
  sku: string
): string {
  return barcode?.trim() || sku.trim();
}

export function isCode128Compatible(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 80 && CODE128_PATTERN.test(trimmed);
}

/** Persisted barcode: explicit value, or BC- derived from BW- SKU, or SKU fallback. */
export function resolveStoredBarcode(sku: string, barcode?: string | null): string {
  const trimmedBarcode = barcode?.trim();
  if (trimmedBarcode) return trimmedBarcode;

  const trimmedSku = sku.trim();
  const skuNum = parseVariantCodeNumber(trimmedSku);
  if (skuNum > 0 && /^BW-/i.test(trimmedSku)) {
    return formatBarcode(skuNum);
  }

  return trimmedSku;
}

function randomTwoDigits() {
  return String(Math.floor(Math.random() * 100)).padStart(2, "0");
}

function formatBarcodePriceDigits(price: number) {
  if (Number.isInteger(price)) {
    return String(price);
  }

  return price.toFixed(2).replace(/\.?0+$/, "");
}

/** Price on printed labels: XX + price + XX (no currency symbol). */
export function formatBarcodeLabelPrice(price: number) {
  return `${randomTwoDigits()}${formatBarcodePriceDigits(price)}${randomTwoDigits()}`;
}
