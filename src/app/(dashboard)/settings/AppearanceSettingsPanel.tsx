"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { updateSettings } from "@/lib/actions/settings";
import {
  DEFAULT_THEME_ACCENT,
  THEME_PRESETS,
  getThemeContrastColor,
  getThemeSidebarColor,
  normalizeHexColor,
} from "@/lib/theme";
import { Palette, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface AppearanceSettingsPanelProps {
  themeAccent?: string;
}

function applyThemeAccent(accent: string) {
  const normalizedAccent = normalizeHexColor(accent);
  const accentForeground = getThemeContrastColor(normalizedAccent);
  const sidebar = getThemeSidebarColor(normalizedAccent);

  document.documentElement.style.setProperty("--theme-accent", normalizedAccent);
  document.documentElement.style.setProperty(
    "--theme-accent-foreground",
    accentForeground
  );
  document.documentElement.style.setProperty("--theme-sidebar", sidebar);
  window.localStorage.setItem("bayt-ward-theme-accent", normalizedAccent);
}

export default function AppearanceSettingsPanel({
  themeAccent,
}: AppearanceSettingsPanelProps) {
  const router = useRouter();
  const initialAccent = useMemo(
    () => normalizeHexColor(themeAccent ?? DEFAULT_THEME_ACCENT),
    [themeAccent]
  );
  const [accent, setAccent] = useState(initialAccent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const sidebarColor = useMemo(() => getThemeSidebarColor(accent), [accent]);

  useEffect(() => {
    applyThemeAccent(accent);
  }, [accent]);

  function choosePreset(value: string) {
    setAccent(normalizeHexColor(value));
    setError("");
    setSuccess("");
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await updateSettings({ theme_accent: accent });

      if (result.success) {
        setSuccess("تم حفظ المظهر بنجاح");
        router.refresh();
        return;
      }

      setError(result.error ?? "تعذر حفظ المظهر");
    } catch {
      setError("تعذر حفظ المظهر");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in srgb, ${accent} 14%, white)` }}
              >
                <Palette className="h-5 w-5" style={{ color: accent }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-brown">مظهر التطبيق</h3>
                <p className="text-sm text-muted">
                  يطبّق اللون المختار على كامل التطبيق مع درجات متناسقة تلقائيًا.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div
                className="rounded-2xl border p-3"
                style={{
                  background: `color-mix(in srgb, ${accent} 8%, white)`,
                  borderColor: `color-mix(in srgb, ${accent} 16%, #e8dcc8)`,
                }}
              >
                <p className="text-xs text-muted">زر رئيسي</p>
                <div
                  className="mt-2 rounded-xl px-3 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: accent }}
                >
                  معاينة
                </div>
              </div>

              <div
                className="rounded-2xl border p-3"
                style={{
                  background: `color-mix(in srgb, ${accent} 6%, white)`,
                  borderColor: `color-mix(in srgb, ${accent} 16%, #e8dcc8)`,
                }}
              >
                <p className="text-xs text-muted">خلفية فاتحة</p>
                <div
                  className="mt-2 h-10 rounded-xl border"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 10%, white), white)`,
                    borderColor: `color-mix(in srgb, ${accent} 12%, #e8dcc8)`,
                  }}
                />
              </div>

              <div
                className="rounded-2xl border p-3"
                style={{
                  background: `color-mix(in srgb, ${accent} 10%, white)`,
                  borderColor: `color-mix(in srgb, ${accent} 16%, #e8dcc8)`,
                }}
              >
                <p className="text-xs text-muted">لون جانبي</p>
                <div
                  className="mt-2 h-10 rounded-xl"
                  style={{ backgroundColor: sidebarColor }}
                />
              </div>
            </div>
          </div>

          <div className="min-w-[280px] space-y-3 rounded-2xl border border-border bg-cream p-4">
            <div>
              <p className="text-sm font-medium text-brown">اختر لون الواجهة</p>
              <p className="text-xs text-muted">
                سيتم اشتقاق الدرجات الفرعية تلقائيًا من اللون المختار.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {THEME_PRESETS.map((preset) => {
                const active = normalizeHexColor(preset.value) === accent;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => choosePreset(preset.value)}
                    className={`group flex flex-col items-center gap-2 rounded-2xl border p-2 transition-all ${
                      active ? "border-gold shadow-md scale-[1.02]" : "border-border hover:border-gold/40"
                    }`}
                    aria-pressed={active}
                  >
                    <span
                      className="h-11 w-11 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: preset.value }}
                    />
                    <span className="text-[11px] font-medium text-brown">{preset.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
              <Input
                label="لون مخصص"
                value={accent}
                onChange={(e) => setAccent(normalizeHexColor(e.target.value))}
                placeholder="#E83E8C"
                className="font-mono uppercase"
                dir="ltr"
              />
              <div className="flex items-end">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(normalizeHexColor(e.target.value))}
                  className="h-11 w-full cursor-pointer rounded-lg border border-border bg-white p-1"
                  aria-label="اختيار لون مخصص"
                />
              </div>
            </div>

            <Button type="button" onClick={handleSave} loading={loading} className="w-full">
              <Save className="h-4 w-4" />
              حفظ المظهر
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
