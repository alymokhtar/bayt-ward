import { COLORS } from "@/lib/constants";

export function normalizeHexColor(value?: string | null): string | undefined {
  if (!value) return undefined;

  const trimmed = String(value).trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const match = normalized.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

  if (!match) return undefined;

  if (match[1].length === 3) {
    return `#${match[1]
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase()}`;
  }

  return normalized.toUpperCase();
}

export function resolveColorSelection(value: string): { label: string; hex?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { label: "", hex: undefined };
  }

  const fromPreset = COLORS.find((color) => color.name === trimmed);
  if (fromPreset) {
    return { label: fromPreset.name, hex: fromPreset.hex };
  }

  const normalizedHex = normalizeHexColor(trimmed);
  if (normalizedHex) {
    return { label: normalizedHex, hex: normalizedHex };
  }

  return { label: trimmed, hex: undefined };
}
