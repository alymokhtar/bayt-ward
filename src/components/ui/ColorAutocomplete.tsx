"use client";

import { COLORS } from "@/lib/constants";
import {
  mergeColorOptions,
  normalizeHexColor,
  persistCustomColor,
  readStoredCustomColors,
  resolveColorSelection,
} from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import { useEffect, useId, useMemo, useRef, useState } from "react";

interface ColorAutocompleteProps {
  label?: string;
  value: string;
  onChange: (color: string, colorHex?: string) => void;
  usedColors?: string[];
  required?: boolean;
  colorHex?: string;
}

export default function ColorAutocomplete({
  label = "اللون",
  value,
  onChange,
  usedColors = [],
  required,
  colorHex,
}: ColorAutocompleteProps) {
  const inputId = useId();
  const hexInputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [hexValue, setHexValue] = useState(colorHex || "");
  const [customColors, setCustomColors] = useState(() => readStoredCustomColors());

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    setHexValue(colorHex || "");
  }, [colorHex]);

  const allSuggestions = useMemo(() => {
    const merged = mergeColorOptions([
      ...COLORS,
      ...customColors,
      ...usedColors.map((color) => ({ name: color, hex: undefined })),
    ]);
    return merged.map((color) => color.name);
  }, [customColors, usedColors]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return allSuggestions.slice(0, 12);
    return allSuggestions
      .filter((color) => color.includes(q))
      .slice(0, 12);
  }, [query, allSuggestions]);

  function persistSelection(name: string, nextHex?: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const normalizedHex = normalizeHexColor(nextHex) ?? undefined;
    const selection = resolveColorSelection(trimmedName);
    const nextCustomColors = persistCustomColor({
      name: trimmedName,
      hex: normalizedHex ?? selection.hex,
    });
    setCustomColors(nextCustomColors);
  }

  function selectColor(color: string) {
    const selection = resolveColorSelection(color);
    setQuery(color);
    setHexValue(selection.hex || "");
    onChange(color, selection.hex);
    persistSelection(color, selection.hex);
    setOpen(false);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    const selection = resolveColorSelection(next);
    setHexValue(selection.hex || "");
    onChange(next, selection.hex);
    setOpen(true);
  }

  function handleHexChange(next: string) {
    const normalized = normalizeHexColor(next) || next.trim();
    setHexValue(normalized);
    onChange(query, normalized);

    if (query.trim() && normalized) {
      persistSelection(query, normalized);
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showSuggestions = open && filtered.length > 0;
  const resolvedHex = normalizeHexColor(hexValue || colorHex) || undefined;

  return (
    <div ref={containerRef} className="relative w-full space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-brown">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="text"
          value={query}
          required={required}
          autoComplete="off"
          placeholder="اكتب اللون..."
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={() => {
            if (query.trim()) {
              persistSelection(query, hexValue);
            }
          }}
          onFocus={() => setOpen(true)}
          className={cn(
            "flex h-11 w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-brown",
            "placeholder:text-muted transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold",
            "hover:border-brown/30"
          )}
        />
        <div className="flex items-center gap-2">
          <input
            id={hexInputId}
            type="text"
            value={hexValue}
            inputMode="text"
            autoComplete="off"
            placeholder="#RRGGBB"
            onChange={(e) => handleHexChange(e.target.value)}
            className="h-11 w-28 rounded-lg border border-border bg-white px-3 py-2 text-sm text-brown"
          />
          <label className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white p-1 shadow-sm">
            <input
              type="color"
              value={resolvedHex || "#000000"}
              onChange={(e) => handleHexChange(e.target.value)}
              className="h-full w-full cursor-pointer rounded-md border-0 bg-transparent p-0"
              aria-label="اختيار درجة اللون"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[...COLORS, ...customColors].map((option) => {
          const isActive = resolvedHex === option.hex;
          return (
            <button
              key={option.name}
              type="button"
              onClick={() => {
                setQuery(option.name);
                const nextHex = option.hex || "";
                setHexValue(nextHex);
                onChange(option.name, nextHex || undefined);
              }}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border bg-white px-2.5 py-1.5 text-xs text-brown shadow-sm",
                isActive && "border-gold bg-gold/10"
              )}
            >
              <span
                className="h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: option.hex || "#D4D4D4" }}
              />
              <span>{option.name}</span>
            </button>
          );
        })}
      </div>

      {showSuggestions && (
        <ul
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filtered.map((color) => {
            const hex = resolveColorSelection(color).hex;
            return (
              <li key={color}>
                <button
                  type="button"
                  role="option"
                  aria-selected={color === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectColor(color)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-brown transition-colors",
                    "hover:bg-gold/10",
                    color === value && "bg-gold/5"
                  )}
                >
                  {hex && (
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: hex }}
                    />
                  )}
                  <span>{color}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
