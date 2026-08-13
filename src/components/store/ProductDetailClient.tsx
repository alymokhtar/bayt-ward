"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ShoppingBag, Share2 } from "lucide-react";
import ProductGallery from "@/components/store/ProductGallery";
import { useStorefrontState } from "@/components/store/StorefrontStateProvider";
import WhatsAppOrderButton from "@/components/store/WhatsAppOrderButton";
import { optimizeCloudinaryUrl, STORE_IMAGE_SIZES } from "@/lib/store/images";
import {
  getAvailableColors,
  getAvailableSizesForColor,
  getColorMedia,
  getProductImages,
  getProductDisplayName,
} from "@/lib/store/product-utils";
import type { StoreProduct } from "@/lib/store/types";
import { cn, formatCurrency, isValidImageUrl } from "@/lib/utils";

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
  const searchParams = useSearchParams();
  const availableColors = useMemo(() => getAvailableColors(product), [product]);
  const initialSelectedColor = availableColors[0]?.name ?? "";
  const requestedColor = searchParams.get("color") || searchParams.get("variant");
  const requestedSize = searchParams.get("size");
  const normalizedRequestedColor = requestedColor
    ? availableColors.find((color) => color.name === requestedColor)?.name ?? null
    : null;

  const [selectedColor, setSelectedColor] = useState<string>(() => normalizedRequestedColor ?? initialSelectedColor);
  const [selectedSize, setSelectedSize] = useState<string | null>(() => requestedSize ?? null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addToCart } = useStorefrontState();

  useEffect(() => {
    if (!zoomOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [zoomOpen]);

  const displayName = getProductDisplayName(product);
  const activeColor = normalizedRequestedColor ??
    (availableColors.some((color) => color.name === selectedColor) ? selectedColor : initialSelectedColor);
  const selectedSizeValue = requestedSize ?? selectedSize;

  const galleryVariants = useMemo(
    () =>
      availableColors.map((color) => {
        const colorMedia = getColorMedia(product, color.name);
        const sizesForColor = getAvailableSizesForColor(product, color.name);
        const images = colorMedia.length > 0 ? colorMedia : sizesForColor[0]?.images ?? [];

        return {
          name: color.name,
          hex: color.hex || "#d4cfc7",
          images,
        };
      }),
    [availableColors, product]
  );

  const sizes = useMemo(
    () => (activeColor ? getAvailableSizesForColor(product, activeColor) : []),
    [product, activeColor]
  );

  const selectedVariant = sizes.find((item) => item.size === selectedSizeValue) ?? sizes[0];
  const images = useMemo(() => {
    if (selectedVariant?.images.length) {
      return selectedVariant.images;
    }

    const colorImages = activeColor
      ? getColorMedia(product, activeColor)
      : availableColors.flatMap((color) => getColorMedia(product, color.name));

    if (colorImages.length > 0) {
      return colorImages;
    }

    const productImages = getProductImages(product);
    return productImages.length > 0 ? productImages : [];
  }, [activeColor, availableColors, product, selectedVariant]);
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
  const activeImageUrl = isValidImageUrl(activeImage?.url) ? activeImage.url : null;
  const cartImageUrl = activeImageUrl
    ? optimizeCloudinaryUrl(activeImageUrl, {
        width: STORE_IMAGE_SIZES.thumbnail.width,
        height: STORE_IMAGE_SIZES.thumbnail.height,
        crop: "fill",
      })
    : null;

  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaY, setTouchDeltaY] = useState(0);

  useEffect(() => {
    if (!zoomOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setZoomOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [zoomOpen]);

  const lightboxNode =
    zoomOpen && activeImage && activeImageUrl
      ? createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/80 opacity-100 transition-opacity duration-300 ease-out"
            role="dialog"
            aria-modal="true"
            aria-label="معاينة الصورة"
            onClick={() => setZoomOpen(false)}
            onTouchStart={(event) => {
              setTouchStartY(event.touches[0]?.clientY ?? null);
              setTouchDeltaY(0);
            }}
            onTouchMove={(event) => {
              if (touchStartY === null) return;
              const currentY = event.touches[0]?.clientY ?? touchStartY;
              const delta = currentY - touchStartY;
              if (delta > 0) {
                setTouchDeltaY(delta);
              }
            }}
            onTouchEnd={() => {
              if (touchDeltaY > 140) {
                setZoomOpen(false);
              }
              setTouchStartY(null);
              setTouchDeltaY(0);
            }}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setZoomOpen(false);
              }}
              aria-label="إغلاق المعاينة"
              className="fixed right-4 top-4 z-[99999] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/60 p-2.5 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 active:scale-95"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div
              className="flex h-full items-center justify-center p-3 sm:p-5"
              style={{ transform: `translateY(${touchDeltaY}px)`, transition: touchStartY === null ? "transform 180ms ease-out" : "none" }}
            >
              <div
                className="relative h-[78dvh] w-full max-w-4xl overflow-hidden rounded-[1.5rem] bg-black/20 opacity-100 scale-100 transition-all duration-300 ease-out"
                onClick={(event) => event.stopPropagation()}
              >
                <Image
                  src={optimizeCloudinaryUrl(activeImageUrl, {
                    width: 1600,
                    quality: 90,
                  })}
                  alt={activeImage.altText || displayName}
                  fill
                  sizes="100vw"
                  className="h-full w-full object-contain transition-transform duration-300 ease-out"
                  priority
                />
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  function handleAddToCart() {
    if (!selectedVariant || !inStock) return;

    addToCart({
      productId: product.id,
      variantId: selectedVariant.variantId,
      name: displayName,
      href: productUrl,
      imageUrl: cartImageUrl ?? null,
      color: activeColor || undefined,
      size: selectedSize || selectedVariant.size,
      unitPrice: price,
      currencySymbol,
    });
    setAddedToCart(true);
    window.setTimeout(() => setAddedToCart(false), 1600);
  }

  return (
    <div className="grid overflow-hidden gap-8 rounded-[2.3rem] border border-[var(--store-border)] bg-[linear-gradient(135deg,rgba(255,250,243,1),rgba(252,247,239,0.95))] p-4 shadow-[0_24px_70px_rgba(80,54,28,0.12)] backdrop-blur md:gap-10 md:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
      <div className="space-y-4">
        <ProductGallery
          productName={displayName}
          priceLabel={formatCurrency(price, currencySymbol)}
          colorVariants={galleryVariants}
          selectedColor={activeColor}
          activeImageIndex={activeImageIndex}
          onSelectColor={handleColorChange}
          onSelectImage={setActiveImageIndex}
          onMainImageClick={(index) => {
            setActiveImageIndex(index);
            setZoomOpen(true);
          }}
        />
      </div>

      <div className="min-w-0 space-y-6">
        <div className="space-y-2">
          <p className="inline-flex rounded-full border border-[var(--store-border)] bg-white/80 px-3 py-1 text-[10px] text-[var(--store-gold)]" dir="rtl">
            {product.category.nameAr?.trim() || product.category.name?.trim() || "القسم"}
          </p>
          {product.brand && (
            <p className="text-sm text-[var(--store-muted)]">{product.brand}</p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-[1.4rem] border border-[var(--store-border)] bg-white/70 px-4 py-3">
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

        {sizes.length > 0 && (
          <div className="space-y-3 rounded-[1.5rem] border border-[var(--store-border)] bg-white/70 p-4">
            <p className="text-sm font-medium">المقاس</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((item) => (
                <button
                  key={item.size}
                  type="button"
                  disabled={!item.inStock}
                  onClick={() => {
                    setSelectedSize(item.size);
                    setActiveImageIndex(0);
                  }}
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
            <h2 className="text-sm font-semibold">الوصف</h2>
            <p className="text-sm leading-7 text-[var(--store-muted)] whitespace-pre-line" dir="rtl">
              {product.description}
            </p>
          </div>
        )}

        <div className="flex w-full flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || !selectedVariant}
            className="inline-flex min-w-[12rem] flex-1 items-center justify-center gap-2 rounded-full bg-[var(--store-gold)] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--store-gold-deep)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addedToCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            {addedToCart ? "تمت الإضافة" : "إضافة إلى السلة"}
          </button>
          <WhatsAppOrderButton
            productName={displayName}
            productUrl={productUrl}
            productId={product.id}
            whatsappNumber={whatsappNumber}
            color={activeColor || undefined}
            size={selectedSizeValue || selectedVariant?.size}
            disabled={!inStock}
            className="min-w-[12rem] flex-1"
          />
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex flex-none items-center justify-center gap-2 rounded-full border border-[var(--store-border)] bg-[var(--store-surface)] px-6 py-3.5 text-sm font-medium text-[var(--store-text)] transition hover:border-[var(--store-gold)]"
          >
            <Share2 className="h-4 w-4" />
            مشاركة
          </button>
        </div>
      </div>

      {lightboxNode}
    </div>
  );
}
