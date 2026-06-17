"use server";

import { normalizeScanCode } from "@/lib/barcode";
import { lookupVariantByCode, searchVariants } from "@/lib/actions/products";

export async function resolveVariantScan(query: string) {
  const q = normalizeScanCode(query);
  if (!q) {
    return { variant: null, matches: [] as Awaited<ReturnType<typeof searchVariants>> };
  }

  const exact = await lookupVariantByCode(q);
  if (exact) {
    return { variant: exact, matches: [exact] };
  }

  const matches = await searchVariants(q);
  if (matches.length === 1) {
    return { variant: matches[0], matches };
  }

  return { variant: null, matches };
}
