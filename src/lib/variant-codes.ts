/** Internal SKU (BW-) and barcode (BC-) sequences — CODE128 compatible. */

export const SKU_PREFIX = "BW-";
export const BARCODE_PREFIX = "BC-";

export function formatSku(sequence: number): string {
  return `${SKU_PREFIX}${String(sequence).padStart(5, "0")}`;
}

export function formatBarcode(sequence: number): string {
  return `${BARCODE_PREFIX}${String(sequence).padStart(5, "0")}`;
}

/** Parse numeric suffix from BW-/BC- codes or legacy values that equal SKU. */
export function parseVariantCodeNumber(code: string): number {
  const trimmed = code.trim();
  const match = trimmed.match(/^(?:BW-|BC-)?(\d+)$/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function computeNextVariantCodes(
  existing: { sku: string; barcode: string | null }[],
  count: number
): { sku: string; barcode: string }[] {
  let maxNum = 0;
  for (const row of existing) {
    maxNum = Math.max(maxNum, parseVariantCodeNumber(row.sku));
    if (row.barcode) {
      maxNum = Math.max(maxNum, parseVariantCodeNumber(row.barcode));
    }
  }

  return Array.from({ length: count }, (_, i) => {
    const n = maxNum + i + 1;
    return { sku: formatSku(n), barcode: formatBarcode(n) };
  });
}
