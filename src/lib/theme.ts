import { prisma } from "@/lib/prisma";
import { CACHE_TAG } from "@/lib/server-cache";
import { unstable_cache } from "next/cache";
import type { CSSProperties } from "react";

export const DEFAULT_THEME_ACCENT = "#B8860B";

export type ThemePreset = {
  name: string;
  value: string;
  description: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "الذهبي",
    value: "#B8860B",
    description: "دافئ وكلاسيكي",
  },
  {
    name: "الوردي",
    value: "#E83E8C",
    description: "عصري وأنيق",
  },
  {
    name: "الأزرق",
    value: "#2563EB",
    description: "هادئ واحترافي",
  },
  {
    name: "كريمي",
    value: "#A07C54",
    description: "ناعم ودافئ",
  },
  {
    name: "بني",
    value: "#69451C",
    description: "دافئ وأنيق",
  },
  {
    name: "البنفسجي",
    value: "#7C3AED",
    description: "فاخر وواضح",
  },
  {
    name: "التركواز",
    value: "#0F766E",
    description: "نظيف وحديث",
  },
  {
    name: "الرمادي الغامق",
    value: "#374151",
    description: "هادئ ومحايد",
  },
];

export function normalizeHexColor(value?: string | null): string {
  if (!value) return DEFAULT_THEME_ACCENT;

  const trimmed = value.trim();
  const shortHex = /^#?[0-9a-fA-F]{3}$/;
  const longHex = /^#?[0-9a-fA-F]{6}$/;

  if (shortHex.test(trimmed)) {
    const hex = trimmed.replace("#", "");
    return `#${hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`.toUpperCase();
  }

  if (longHex.test(trimmed)) {
    return trimmed.startsWith("#") ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
  }

  return DEFAULT_THEME_ACCENT;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex).slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return { red, green, blue };
}

function toHexChannel(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

export function getThemeContrastColor(hex: string): string {
  const { red, green, blue } = hexToRgb(hex);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance >= 160 ? "#1A1A1A" : "#FFFFFF";
}

export function getThemeSidebarColor(hex: string): string {
  const { red, green, blue } = hexToRgb(hex);
  const sidebarRatio = 0.46;

  return `#${toHexChannel(red * sidebarRatio)}${toHexChannel(
    green * sidebarRatio
  )}${toHexChannel(blue * sidebarRatio)}`;
}

export function buildThemeStyle(themeAccent?: string | null): CSSProperties {
  const normalizedAccent = normalizeHexColor(themeAccent);
  const accentForeground = getThemeContrastColor(normalizedAccent);
  const sidebar = getThemeSidebarColor(normalizedAccent);

  return {
    ["--theme-accent" as never]: normalizedAccent,
    ["--theme-accent-foreground" as never]: accentForeground,
    ["--theme-sidebar" as never]: sidebar,
  } as CSSProperties;
}

export const getAppThemeAccent = unstable_cache(
  async () => {
    const setting = await prisma.setting.findUnique({
      where: { key: "theme_accent" },
      select: { value: true },
    });

    return normalizeHexColor(setting?.value);
  },
  ["app-theme-accent"],
  { tags: [CACHE_TAG.settings], revalidate: 300 }
);
