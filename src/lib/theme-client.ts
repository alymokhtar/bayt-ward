import {
  getThemeContrastColor,
  getThemeSidebarColor,
  normalizeHexColor,
} from "@/lib/theme";

export const THEME_ACCENT_STORAGE_PREFIX = "bayt-ward-theme-accent";

export function getThemeAccentStorageKey(userId: string) {
  return `${THEME_ACCENT_STORAGE_PREFIX}:${userId}`;
}

export function applyThemeAccentToDocument(accent: string) {
  const normalizedAccent = normalizeHexColor(accent);
  const accentForeground = getThemeContrastColor(normalizedAccent);
  const sidebar = getThemeSidebarColor(normalizedAccent);

  document.documentElement.style.setProperty("--theme-accent", normalizedAccent);
  document.documentElement.style.setProperty(
    "--theme-accent-foreground",
    accentForeground
  );
  document.documentElement.style.setProperty("--theme-sidebar", sidebar);

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", normalizedAccent);
  }
}

export function readStoredThemeAccent(userId: string) {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(getThemeAccentStorageKey(userId));
  return stored ? normalizeHexColor(stored) : null;
}

export function storeThemeAccent(accent: string, userId: string) {
  window.localStorage.setItem(
    getThemeAccentStorageKey(userId),
    normalizeHexColor(accent)
  );
}
