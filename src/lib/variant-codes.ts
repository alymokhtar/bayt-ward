/** Internal SKU (BW-) and barcode (BC-) sequences — CODE128 compatible. */

export const SKU_PREFIX = "BW-";
export const BARCODE_PREFIX = "BC-";

export type VariantCodeRow = {
  id?: string;
  sku: string;
  barcode: string | null;
};

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

/** Every SKU and barcode value must be unique across the whole store (single namespace). */
export function buildGlobalCodeSet(rows: VariantCodeRow[]): Set<string> {
  const codes = new Set<string>();
  for (const row of rows) {
    const sku = row.sku.trim();
    const barcode = row.barcode?.trim();
    if (sku) codes.add(sku);
    if (barcode) codes.add(barcode);
  }
  return codes;
}

export function normalizePair(sku: string, barcode: string): { sku: string; barcode: string } {
  return { sku: sku.trim(), barcode: barcode.trim() };
}

export type VariantCodeIssue =
  | { field: "sku"; message: string }
  | { field: "barcode"; message: string };

export function findVariantCodeIssues(
  sku: string,
  barcode: string,
  usedCodes: Set<string>
): VariantCodeIssue[] {
  const { sku: s, barcode: b } = normalizePair(sku, barcode);
  const issues: VariantCodeIssue[] = [];

  if (!s) {
    issues.push({ field: "sku", message: "SKU مطلوب" });
    return issues;
  }

  if (!b) {
    issues.push({ field: "barcode", message: "الباركود مطلوب" });
    return issues;
  }

  if (s.toLowerCase() === b.toLowerCase()) {
    issues.push({
      field: "barcode",
      message: "الباركود يجب أن يختلف عن SKU لنفس المتغير",
    });
  }

  if (usedCodes.has(s)) {
    issues.push({
      field: "sku",
      message: "رمز SKU مستخدم لمتغير آخر — يجب أن يكون فريداً",
    });
  }

  if (usedCodes.has(b)) {
    issues.push({
      field: "barcode",
      message: "الباركود مستخدم لمتغير آخر — يجب أن يكون فريداً",
    });
  }

  return issues;
}

export function registerVariantCodes(
  sku: string,
  barcode: string,
  usedCodes: Set<string>
): void {
  const { sku: s, barcode: b } = normalizePair(sku, barcode);
  usedCodes.add(s);
  usedCodes.add(b);
}

export function validateVariantCodesPayload(
  variants: { id?: string; sku: string; barcode: string }[],
  existingRows: VariantCodeRow[]
): void {
  const usedCodes = buildGlobalCodeSet(existingRows);

  for (const variant of variants) {
    if (variant.id) {
      const previous = existingRows.find((row) => row.id === variant.id);
      if (previous) {
        usedCodes.delete(previous.sku.trim());
        const prevBarcode = previous.barcode?.trim();
        if (prevBarcode) usedCodes.delete(prevBarcode);
      }
    }

    const issues = findVariantCodeIssues(variant.sku, variant.barcode, usedCodes);
    if (issues.length > 0) {
      throw new Error(issues[0].message);
    }

    registerVariantCodes(variant.sku, variant.barcode, usedCodes);
  }
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
