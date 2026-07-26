import { COLORS } from "@/lib/constants";

export type ColorOption = { name: string; hex?: string | null };

const CUSTOM_COLORS_STORAGE_KEY = "dashboard.custom-colors";

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

export function mergeColorOptions(options: ColorOption[]): ColorOption[] {
  const merged = new Map<string, ColorOption>();

  COLORS.forEach((color) => {
    merged.set(color.name, { name: color.name, hex: color.hex });
  });

  options.forEach((color) => {
    const normalizedName = color.name?.trim();
    if (!normalizedName) return;

    const normalizedHex = normalizeHexColor(color.hex);
    merged.set(normalizedName, {
      name: normalizedName,
      hex: normalizedHex ?? undefined,
    });
  });

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export function getDuplicateVariantColorError(
  variants: Array<{ color?: string | null }>
): string | null {
  const seen = new Set<string>();

  for (const variant of variants) {
    const color = variant.color?.trim();
    if (!color) continue;

    const key = color.toLowerCase();
    if (seen.has(key)) {
      return `لا يمكن إضافة أكثر من متغير بنفس اللون: ${color}`;
    }

    seen.add(key);
  }

  return null;
}

export function readStoredCustomColors(): ColorOption[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as ColorOption[];
    return Array.isArray(parsed)
      ? parsed.filter((color) => color?.name?.trim()).map((color) => ({
          name: color.name.trim(),
          hex: normalizeHexColor(color.hex) ?? undefined,
        }))
      : [];
  } catch {
    return [];
  }
}

export function persistCustomColor(color: ColorOption): ColorOption[] {
  const normalizedName = color.name?.trim();
  if (!normalizedName) return readStoredCustomColors();

  const existing = readStoredCustomColors();
  const isPreset = COLORS.some((item) => item.name === normalizedName);
  if (isPreset) return existing;

  const next = existing.filter((entry) => entry.name !== normalizedName);
  next.push({
    name: normalizedName,
    hex: normalizeHexColor(color.hex) ?? undefined,
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}
