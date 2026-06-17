import { resolveVariantScan } from "@/lib/actions/variant-scan";
import type { searchVariants } from "@/lib/actions/products";

export type VariantResult = Awaited<ReturnType<typeof searchVariants>>[number];

export type VariantScanResult =
  | { status: "empty" }
  | { status: "found"; variant: VariantResult }
  | { status: "choose"; matches: VariantResult[] }
  | { status: "not_found" };

export async function scanVariantCode(code: string): Promise<VariantScanResult> {
  const q = code.trim();
  if (!q) return { status: "empty" };

  const { variant, matches } = await resolveVariantScan(q);

  if (variant) return { status: "found", variant };
  if (matches.length > 1) return { status: "choose", matches };
  return { status: "not_found" };
}
