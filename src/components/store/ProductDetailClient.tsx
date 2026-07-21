"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, ShoppingBag, Share2 } from "lucide-react";
import ColorSwatches from "@/components/store/ColorSwatches";
import { useStorefrontState } from "@/components/store/StorefrontStateProvider";
import WhatsAppOrderButton from "@/components/store/WhatsAppOrderButton";
import { optimizeCloudinaryUrl, STORE_IMAGE_SIZES } from "@/lib/store/images";
import {
  getAvailableSizesForColor,
  getColorMedia,
  getDefaultColor,
  getProductDisplayName,
  getVariantStockForColor,
} from "@/lib/store/product-utils";
import type { StoreProduct } from "@/lib/store/types";
import { cn, formatCurrency } from "@/lib/utils";

type ProductDetailClientProps = {
  product: StoreProduct;
  productUrl: string;
  whatsappNumber: string;
  currencySymbol: string;
};

export default function ProductDetailClient({
  product,
  productUrl,
  whatsappNumber,
  currencySymbol,
}: ProductDetailClientProps) {
  const defaultColor = getDefaultColor(product);
  const [selectedColor, setSelectedColor] = useState(defaultColor ?? "");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addToCart } = useStorefrontState();

  const displayName = getProductDisplayName(product);

  const colorOptions = useMemo(
    () =>
      product.colors.map((color) => ({
        name: color.color,
        hex: color.colorHex,
      })),
    [product.colors]
  );

  const unavailableColors = useMemo(
    () =>
      colorOptions
        .map((color) => color.name)
        .filter((name) => getVariantStockForColor(product, name) <= 0),
    [colorOptions, product]
  );

  const images = useMemo(() => {
    if (!selectedColor) {
      const fallback = product.colors.flatMap((color) =>
        getColorMedia(product, color.color)
      );
      return fallback.length > 0
        ? fallback
        : product.imageUrl
          ? [{ id: "fallback", url: product.imageUrl, altText: displayName }]
          : [];
    }
    return getColorMedia(product, selectedColor);
  }, [product, selectedColor, displayName]);

  const sizes = useMemo(
    () => (selectedColor ? getAvailableSizesForColor(product, selectedColor) : []),
    [product, selectedColor]
  );

  const selectedVariant = sizes.find((item) => item.size === selectedSize) ?? sizes[0];
  const price = selectedVariant?.price ?? product.variants[0]?.sellingPrice ?? 0;
  const inStock = selectedVariant ? selectedVariant.inStock : product.variants.some((v) => v.stockQuantity > 0);

  function handleColorChange(color: string) {
    setSelectedColor(color);
    setSelectedSize(null);
    setActiveImageIndex(0);
  }

  async function handleShare() {
    const shareData = {
      title: displayName,
      text: displayName,
      url: productUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to clipboard
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(productUrl);
    }
  }

  const activeImage = images[activeImageIndex] ?? images[0];
  const cartImageUrl = activeImage
    ? optimizeCloudinaryUrl(activeImage.url, {
        width: STORE_IMAGE_SIZES.thumbnail.width,
        height: STORE_IMAGE_SIZES.thumbnail.height,
        crop: "fill",
      })
    : product.imageUrl;

  function handleAddToCart() {
    if (!selectedVariant || !inStock) return;

    addToCart({
      productId: product.id,
      variantId: selectedVariant.variantId,
      name: displayName,
      href: productUrl,
      imageUrl: cartImageUrl ?? null,
      color: selectedColor || undefined,
      size: selectedSize || selectedVariant.size,
      unitPrice: price,
      currencySymbol,
    });
    setAddedToCart(true);
    window.setTimeout(() => setAddedToCart(false), 1600);
  }

  return (
    <div className="grid gap-8 rounded-[2.3rem] border border-[var(--store-border)] bg-[linear-gradient(135deg,rgba(255,250,243,1),rgba(252,247,239,0.95))] p-4 shadow-[0_24px_70px_rgba(80,54,28,0.12)] backdrop-blur md:gap-10 md:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
      <div className="space-y-4">
        <button
          type="button"
          className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-[var(--store-border)] bg-[var(--store-surface)] p-2 shadow-sm"
          onClick={() => activeImage && setZoomOpen(true)}
          aria-label="تكبير الصورة"
        >
          {activeImage ? (
            <Image
              src={optimizeCloudinaryUrl(activeImage.url, {
                width: STORE_IMAGE_SIZES.gallery.width,
                height: STORE_IMAGE_SIZES.gallery.height,
                crop: "fill",
              })}
              alt={activeImage.altText || displayName}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--store-muted)]">
              لا توجد صورة
            </div>
          )}
        </button>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={`صورة ${index + 1}`}
                aria-current={index === activeImageIndex}
                onClick={() => setActiveImageIndex(index)}
                className={cn(
                  "relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2",
                  index === activeImageIndex
                    ? "border-[var(--store-gold)]"
                    : "border-transparent"
                )}
              >
                <Image
                  src={optimizeCloudinaryUrl(image.url, {
                    width: STORE_IMAGE_SIZES.thumbnail.width,
                    height: STORE_IMAGE_SIZES.thumbnail.height,
                    crop: "fill",
                  })}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="inline-flex rounded-full border border-[var(--store-border)] bg-white/80 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-[var(--store-gold)]">
            {product.category.nameAr || product.category.name}
          </p>
          <h1 className="store-serif text-3xl font-semibold md:text-4xl">{displayName}</h1>
          {product.brand && (
            <p className="text-sm text-[var(--store-muted)]">{product.brand}</p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-[1.4rem] border border-[var(--store-border)] bg-white/70 px-4 py-3">
          <p className="text-2xl font-semibold text-[var(--store-text)]">
            {formatCurrency(price, currencySymbol)}
          </p>
          <p
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-medium",
              inStock
                ? "bg-emerald-50 text-emerald-700"
                : "bg-neutral-100 text-neutral-600"
            )}
          >
            {inStock ? "متوفر" : "غير متوفر حالياً"}
          </p>
        </div>

        {colorOptions.length > 0 && (
          <div className="space-y-3 rounded-[1.5rem] border border-[var(--store-border)] bg-white/70 p-4">
            <p className="text-sm font-medium">اللون: {selectedColor || "—"}</p>
            <ColorSwatches
              colors={colorOptions}
              activeColor={selectedColor}
              onSelect={handleColorChange}
              unavailableColors={unavailableColors}
            />
          </div>
        )}

        {sizes.length > 0 && (
          <div className="space-y-3 rounded-[1.5rem] border border-[var(--store-border)] bg-white/70 p-4">
            <p className="text-sm font-medium">المقاس</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((item) => (
                <button
                  key={item.size}
                  type="button"
                  disabled={!item.inStock}
                  onClick={() => setSelectedSize(item.size)}
                  className={cn(
                    "min-w-12 rounded-full border px-4 py-2 text-sm transition",
                    selectedSize === item.size || (!selectedSize && item === sizes[0])
                      ? "border-[var(--store-text)] bg-[var(--store-text)] text-white"
                      : "border-[var(--store-border)] bg-[var(--store-surface)] text-[var(--store-text)]",
                    !item.inStock && "opacity-40 line-through"
                  )}
                >
                  {item.size}
                </button>
              ))}
            </div>
          </div>
        )}

        {product.description && (
          <div className="space-y-2 rounded-[1.5rem] border border-[var(--store-border)] bg-white/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">الوصف</h2>
            <p className="text-sm leading-7 text-[var(--store-muted)] whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || !selectedVariant}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--store-gold)] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--store-gold-deep)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addedToCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            {addedToCart ? "تمت الإضافة" : "إضافة إلى السلة"}
          </button>
          <WhatsAppOrderButton
            productName={displayName}
            productUrl={productUrl}
            whatsappNumber={whatsappNumber}
            color={selectedColor || undefined}
            size={selectedSize || selectedVariant?.size}
            disabled={!inStock}
            className="flex-1 sm:flex-none"
          />
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--store-border)] bg-[var(--store-surface)] px-6 py-3.5 text-sm font-medium text-[var(--store-text)] transition hover:border-[var(--store-gold)]"
          >
            <Share2 className="h-4 w-4" />
            مشاركة
          </button>
        </div>
      </div>

      {zoomOpen && activeImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="معاينة الصورة"
          onClick={() => setZoomOpen(false)}
        >
          <div className="relative h-[80vh] w-full max-w-4xl">
            <Image
              src={optimizeCloudinaryUrl(activeImage.url, {
                width: 1600,
                quality: 90,
              })}
              alt={activeImage.altText || displayName}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
