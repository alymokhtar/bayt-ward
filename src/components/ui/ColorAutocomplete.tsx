"use client";

import { COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useEffect, useId, useMemo, useRef, useState } from "react";

interface ColorAutocompleteProps {
  label?: string;
  value: string;
  onChange: (color: string, colorHex?: string) => void;
  usedColors?: string[];
  required?: boolean;
}

function resolveColorHex(color: string): string | undefined {
  return COLORS.find((c) => c.name === color)?.hex;
}

export default function ColorAutocomplete({
  label = "اللون",
  value,
  onChange,
  usedColors = [],
  required,
}: ColorAutocompleteProps) {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const allSuggestions = useMemo(() => {
    const merged = new Set<string>([
      ...COLORS.map((c) => c.name),
      ...usedColors,
    ]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b, "ar"));
  }, [usedColors]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return allSuggestions.slice(0, 12);
    return allSuggestions
      .filter((color) => color.includes(q))
      .slice(0, 12);
  }, [query, allSuggestions]);

  function selectColor(color: string) {
    setQuery(color);
    onChange(color, resolveColorHex(color));
    setOpen(false);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    onChange(next, resolveColorHex(next));
    setOpen(true);
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

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-brown">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={query}
        required={required}
        autoComplete="off"
        placeholder="اكتب اللون..."
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        className={cn(
          "flex h-11 w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-brown",
          "placeholder:text-muted transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold",
          "hover:border-brown/30"
        )}
      />
      {showSuggestions && (
        <ul
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filtered.map((color) => {
            const hex = resolveColorHex(color);
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
