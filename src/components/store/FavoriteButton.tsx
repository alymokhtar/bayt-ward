"use client";

import { Heart } from "lucide-react";
import { useStorefrontState } from "@/components/store/StorefrontStateProvider";
import { cn } from "@/lib/utils";

type FavoriteButtonProps = {
  item: {
    id: string;
    name: string;
    href: string;
    imageUrl: string | null;
    priceLabel: string;
  };
};

export default function FavoriteButton({ item }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useStorefrontState();
  const favoriteActive = isFavorite(item.id);

  return (
    <button
      type="button"
      className={cn(
        "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[var(--store-gold)] shadow-sm backdrop-blur transition hover:scale-105",
        favoriteActive && "bg-[var(--store-gold)] text-white"
      )}
      aria-label={favoriteActive ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      aria-pressed={favoriteActive}
      onClick={() => toggleFavorite(item)}
    >
      <Heart className={cn("h-4 w-4", favoriteActive && "fill-current")} />
    </button>
  );
}
