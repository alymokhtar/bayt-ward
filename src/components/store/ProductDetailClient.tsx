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

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);
  const [touchDeltaY, setTouchDeltaY] = useState(0);
  const [gestureAxis, setGestureAxis] = useState<"horizontal" | "vertical" | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

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

  useEffect(() => {
    if (!zoomOpen || images.length <= 1 || hasInteracted) return;

    const timer = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % images.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [zoomOpen, images.length, hasInteracted]);

  const markAsInteracted = () => {
    setHasInteracted(true);
  };

  const navigateImage = (direction: "next" | "prev") => {
    if (images.length <= 1) return;

    const nextIndex =
      direction === "next"
        ? (activeImageIndex + 1) % images.length
        : (activeImageIndex - 1 + images.length) % images.length;

    markAsInteracted();
    setActiveImageIndex(nextIndex);
  };

  const lightboxNode =
    zoomOpen && activeImage && activeImageUrl
      ? createPortal(
          <div
            className="fixed inset-0 z-[99999] h-[100dvh] bg-black/88 opacity-100 transition-opacity duration-500 ease-out"
            role="dialog"
            aria-modal="true"
            aria-label="معاينة الصورة"
            onClick={() => setZoomOpen(false)}
            onTouchStart={(event) => {
              const x = event.touches[0]?.clientX ?? 0;
              const y = event.touches[0]?.clientY ?? 0;
              setTouchStartX(x);
              setTouchStartY(y);
              setTouchDeltaX(0);
              setTouchDeltaY(0);
              setGestureAxis(null);
              markAsInteracted();
            }}
            onTouchMove={(event) => {
              if (touchStartX === null || touchStartY === null) return;

              const currentX = event.touches[0]?.clientX ?? touchStartX;
              const currentY = event.touches[0]?.clientY ?? touchStartY;
              const deltaX = currentX - touchStartX;
              const deltaY = currentY - touchStartY;

              if (gestureAxis === null) {
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 14) {
                  setGestureAxis("horizontal");
                } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 14) {
                  setGestureAxis("vertical");
                }
              }

              if (gestureAxis === "horizontal") {
                setTouchDeltaX(deltaX);
              } else if (gestureAxis === "vertical") {
                setTouchDeltaY(deltaY);
              }
            }}
            onTouchEnd={() => {
              if (gestureAxis === "horizontal") {
                if (Math.abs(touchDeltaX) > 60) {
                  navigateImage(touchDeltaX < 0 ? "next" : "prev");
                }
              } else if (gestureAxis === "vertical" && touchDeltaY > 120) {
                setZoomOpen(false);
              }

              setTouchStartX(null);
              setTouchStartY(null);
              setTouchDeltaX(0);
              setTouchDeltaY(0);
              setGestureAxis(null);
            }}
          >
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                transform: `translateY(${gestureAxis === "vertical" ? touchDeltaY : 0}px)`,
                transition: gestureAxis === null ? "transform 180ms ease-out" : "none",
              }}
            >
              <div
                className="relative h-[100dvh] w-screen overflow-hidden bg-black/20 opacity-100 scale-100 transition-all duration-500 ease-out"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setZoomOpen(false);
                  }}
                  aria-label="إغلاق المعاينة"
                  className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[99999] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/60 p-2.5 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 active:scale-95"
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

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="الصورة السابقة"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigateImage("prev");
                      }}
                      className="absolute left-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-black/70 active:scale-95"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      aria-label="الصورة التالية"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigateImage("next");
                      }}
                      className="absolute right-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-black/70 active:scale-95"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}

                <div
                  className="relative h-full w-full"
                  style={{
                    transform: `translateX(${gestureAxis === "horizontal" ? touchDeltaX * 0.2 : 0}px)`,
                    transition: gestureAxis === null ? "transform 250ms ease-out" : "none",
                  }}
                >
                  {images.map((image, index) => {
                    const isActive = index === activeImageIndex;
                    return (
                      <Image
                        key={image.id || `${image.url}-${index}`}
                        src={optimizeCloudinaryUrl(image.url, {
                          width: 1600,
                          quality: 90,
                        })}
                        alt={image.altText || displayName}
                        fill
                        sizes="100vw"
                        className={cn(
                          "absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ease-out",
                          isActive ? "opacity-100" : "opacity-0"
                        )}
                        priority={isActive}
                      />
                    );
                  })}
                </div>

                {images.length > 1 && (
                  <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2 px-4">
                    {images.map((image, index) => {
                      const isActive = index === activeImageIndex;

                      return (
                        <button
                          key={image.id || `${image.url}-${index}`}
                          type="button"
                          aria-label={`عرض الصورة ${index + 1}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            markAsInteracted();
                            setActiveImageIndex(index);
                          }}
                          className={cn(
                            "h-2.5 rounded-full transition-all duration-200",
                            isActive ? "w-8 bg-white" : "w-2.5 bg-white/60 hover:bg-white/80"
                          )}
                        />
                      );
                    })}
                  </div>
                )}
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
    <div className="grid gap-3 overflow-hidden rounded-[1.8rem] border border-[#eadcc9] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_rgba(255,246,236,0.96)_35%,_rgba(247,239,230,0.98)_100%)] p-2.5 shadow-[0_18px_48px_rgba(80,54,28,0.1)] backdrop-blur md:gap-10 md:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
      <div className="space-y-2 md:space-y-4">
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
            setHasInteracted(false);
            setZoomOpen(true);
          }}
        />
      </div>

      <div className="min-w-0 space-y-2 md:space-y-6">
        <div className="space-y-1 md:space-y-2">
          <p className="inline-flex rounded-full border border-[var(--store-border)] bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[var(--store-gold)] md:px-3" dir="rtl">
            {product.category.nameAr?.trim() || product.category.name?.trim() || "القسم"}
          </p>
          {product.brand && (
            <p className="text-xs text-[var(--store-muted)] md:text-sm">{product.brand}</p>
          )}
        </div>

        <div className="rounded-[1.2rem] border border-[#eadcc9] bg-white/80 p-2.5 shadow-[0_8px_18px_rgba(88,61,34,0.04)] md:p-4">
          <div className="flex flex-col gap-2 md:gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[var(--store-muted)] md:text-sm">الحالة</span>
              <p
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm md:px-3 md:text-xs",
                  inStock
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-neutral-100 text-neutral-600"
                )}
              >
                {inStock ? "متوفر" : "غير متوفر حالياً"}
              </p>
            </div>

            {sizes.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--store-muted)] md:text-sm">المقاس</span>
                <div className="flex flex-wrap justify-end gap-1.5 md:gap-2">
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
                        "min-w-9 rounded-full border px-2 py-1.5 text-[10px] font-medium transition md:min-w-12 md:px-4 md:py-2 md:text-sm",
                        selectedSize === item.size || (!selectedSize && item === sizes[0])
                          ? "border-[var(--store-text)] bg-[var(--store-text)] text-white shadow-sm"
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
          </div>
        </div>

        {product.description && (
          <div className="space-y-2 rounded-[1.15rem] border border-[var(--store-border)] bg-white/70 p-3 md:p-4">
            <h2 className="text-xs font-semibold text-[var(--store-text)] md:text-sm">الوصف</h2>
            <p className="text-xs leading-6 text-[var(--store-muted)] whitespace-pre-line md:text-sm md:leading-7" dir="rtl">
              {product.description}
            </p>
          </div>
        )}

        <div className="flex w-full flex-col gap-2.5 md:gap-3">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || !selectedVariant}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#b88938,#a8732d)] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(184,137,56,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 md:px-6 md:py-3.5"
          >
            {addedToCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            {addedToCart ? "تمت الإضافة" : "إضافة إلى السلة"}
          </button>

          <div className="flex w-full items-stretch gap-2.5 md:gap-3">
            <WhatsAppOrderButton
              productName={displayName}
              productUrl={productUrl}
              productId={product.id}
              whatsappNumber={whatsappNumber}
              color={activeColor || undefined}
              size={selectedSizeValue || selectedVariant?.size}
              disabled={!inStock}
              className="flex-[2] min-w-0 whitespace-nowrap rounded-full px-3 py-3 text-sm md:px-6 md:py-3.5"
            />

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex w-16 flex-none items-center justify-center gap-2 rounded-full border border-[var(--store-border)] bg-[var(--store-surface)] px-2 py-3 text-sm font-medium text-[var(--store-text)] transition hover:border-[var(--store-gold)] md:w-20 md:px-6 md:py-3.5"
              aria-label="مشاركة المنتج"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {lightboxNode}
    </div>
  );
}
