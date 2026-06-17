"use server";

import { normalizeScanCode } from "@/lib/barcode";
import {
  findVariantsByExactCode,
  searchVariants,
} from "@/lib/actions/products";

export async function resolveVariantScan(query: string) {
  const q = normalizeScanCode(query);
  if (!q) {
    return {
      variant: null,
      matches: [] as Awaited<ReturnType<typeof searchVariants>>,
      ambiguous: false,
    };
  }

  const exactMatches = await findVariantsByExactCode(q);
  if (exactMatches.length > 1) {
    return { variant: null, matches: exactMatches, ambiguous: true };
  }
  if (exactMatches.length === 1) {
    return { variant: exactMatches[0], matches: exactMatches, ambiguous: false };
  }

  const matches = await searchVariants(q);
  if (matches.length === 1) {
    return { variant: matches[0], matches, ambiguous: false };
  }

  return { variant: null, matches, ambiguous: false };
}
