import { SIZES } from "@/lib/constants";

export const CUSTOM_SIZE_OPTION_VALUE = "__custom__";

export function getVariantSizeMode(sizeValue?: string | null): "preset" | "custom" {
  const normalized = (sizeValue ?? "").trim();
  if (!normalized) return "preset";
  if (normalized === CUSTOM_SIZE_OPTION_VALUE) return "custom";
  return SIZES.includes(normalized) ? "preset" : "custom";
}

export function getVariantSizeSelectValue(sizeValue?: string | null, mode?: "preset" | "custom") {
  const normalized = (sizeValue ?? "").trim();
  if (mode === "custom") {
    return CUSTOM_SIZE_OPTION_VALUE;
  }
  if (!normalized) return "";
  return normalized;
}

export function resolveVariantSize(mode: "preset" | "custom", inputValue?: string | null) {
  const trimmed = (inputValue ?? "").trim();
  if (mode === "custom") {
    return trimmed;
  }
  return trimmed || "";
}
