import { cn } from "@/lib/utils";

type ColorSwatchesProps = {
  colors: { name: string; hex?: string | null }[];
  size?: "sm" | "md";
  activeColor?: string;
  onSelect?: (color: string) => void;
  unavailableColors?: string[];
};

const FALLBACK_HEX = "#d4cfc7";

export default function ColorSwatches({
  colors,
  size = "md",
  activeColor,
  onSelect,
  unavailableColors = [],
}: ColorSwatchesProps) {
  if (colors.length === 0) return null;

  const unique = Array.from(
    new Map(colors.map((color) => [color.name, color])).values()
  );

  const swatchSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="الألوان المتاحة">
      {unique.map((color) => {
        const unavailable = unavailableColors.includes(color.name);
        const isActive = activeColor === color.name;
        const hex = color.hex || FALLBACK_HEX;

        if (onSelect) {
          return (
            <button
              key={color.name}
              type="button"
              role="listitem"
              aria-label={`${color.name}${unavailable ? " — غير متوفر" : ""}`}
              aria-pressed={isActive}
              disabled={unavailable}
              onClick={() => onSelect(color.name)}
              className={cn(
                "rounded-full border-2 p-0.5 transition",
                isActive ? "border-[var(--store-gold)]" : "border-transparent",
                unavailable && "opacity-40 cursor-not-allowed"
              )}
            >
              <span
                className={cn("block rounded-full", swatchSize)}
                style={{ backgroundColor: hex }}
              />
            </button>
          );
        }

        return (
          <span
            key={color.name}
            role="listitem"
            aria-label={color.name}
            className={cn("block rounded-full border border-black/10", swatchSize)}
            style={{ backgroundColor: hex }}
            title={color.name}
          />
        );
      })}
    </div>
  );
}
