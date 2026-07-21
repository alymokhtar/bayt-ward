"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { useStorefrontState } from "@/components/store/StorefrontStateProvider";

export default function FavoritesClient() {
  const { favoriteItems, removeFavorite } = useStorefrontState();

  if (favoriteItems.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[var(--store-border)] bg-white/80 px-6 py-16 text-center shadow-sm">
        <Heart className="mx-auto h-11 w-11 text-[var(--store-gold)]" />
        <p className="store-serif mt-4 text-2xl text-[var(--store-text)]">
          لا توجد منتجات في المفضلة
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[var(--store-muted)]">
          اضغطي على أيقونة القلب في بطاقة المنتج لحفظ القطع التي أعجبتك.
        </p>
        <Link
          href="/store/products"
          className="mt-6 inline-flex rounded-full bg-[var(--store-gold)] px-7 py-3 text-sm font-bold text-white transition hover:bg-[var(--store-gold-deep)]"
        >
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {favoriteItems.map((item) => (
        <article
          key={item.id}
          className="group overflow-hidden rounded-lg border border-[var(--store-border)] bg-white shadow-[0_8px_24px_rgba(75,54,37,0.09)] transition duration-300 hover:-translate-y-1"
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-[var(--store-cream)]">
            <Link href={item.href} className="block h-full">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-3 text-center text-sm text-[var(--store-muted)]">
                  لا توجد صورة
                </div>
              )}
            </Link>
            <button
              type="button"
              className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[var(--store-gold)] shadow-sm backdrop-blur transition hover:bg-[var(--store-gold)] hover:text-white"
              onClick={() => removeFavorite(item.id)}
              aria-label="إزالة من المفضلة"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <Link href={item.href} className="block space-y-2 px-3 py-4 text-center">
            <h3 className="line-clamp-1 text-sm font-medium text-[var(--store-text)] transition group-hover:text-[var(--store-gold)] md:text-base">
              {item.name}
            </h3>
            <p dir="ltr" className="text-sm font-bold text-[var(--store-text)]">
              {item.priceLabel}
            </p>
          </Link>
        </article>
      ))}
    </div>
  );
}
