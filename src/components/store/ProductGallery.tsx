"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type GalleryImage = {
  id: string;
  url: string;
  alt?: string;
};

type ColorVariant = {
  name: string;
  hex: string;
  images: GalleryImage[];
};

type ProductGalleryProps = {
  productName: string;
  priceLabel: string;
  colorVariants: ColorVariant[];
  selectedColor: string;
  onSelectColor: (color: string) => void;
  onMainImageClick?: () => void;
};

export default function ProductGallery({
  productName,
  priceLabel,
  colorVariants,
  selectedColor,
  onSelectColor,
  onMainImageClick,
}: ProductGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const selectedVariant = useMemo(
    () => colorVariants.find((variant) => variant.name === selectedColor) ?? colorVariants[0],
    [colorVariants, selectedColor]
  );

  const images = selectedVariant?.images ?? [];
  const activeImage = images[activeImageIndex] ?? images[0];

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedColor]);

  function handleColorChange(color: string) {
    onSelectColor(color);
  }

  function handleThumbnailClick(index: number) {
    setActiveImageIndex(index);
  }

  return (
    <section className="mx-auto w-full max-w-md px-4 pb-6 sm:px-0">
      <div className="overflow-hidden rounded-[2rem] bg-[#fff6ed] p-3 shadow-sm shadow-[rgba(111,80,47,0.12)]">
        <button
          type="button"
          onClick={onMainImageClick}
          aria-label="تكبير الصورة"
          className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] bg-[#fff1e0] shadow-sm"
        >
          {activeImage ? (
            <Image
              src={activeImage.url}
              alt={activeImage.alt || productName}
              fill
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#8f7a68]">
              لا توجد صورة متاحة
            </div>
          )}
        </button>

        {images.length > 1 && (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => handleThumbnailClick(index)}
                aria-label={`عرض الصورة ${index + 1}`}
                aria-current={index === activeImageIndex}
                className={`min-w-[5.25rem] overflow-hidden rounded-2xl border border-transparent bg-white/80 shadow-sm transition duration-150 ease-out hover:border-[rgba(249,166,75,0.5)] hover:shadow-md ${
                  index === activeImageIndex ? "ring-2 ring-[rgba(255,190,135,0.85)]" : ""
                } active:scale-95`}
              >
                <div className="relative h-20 w-full">
                  <Image
                    src={image.url}
                    alt={image.alt || productName}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 rounded-[1.75rem] bg-white/95 px-3 py-3 shadow-sm shadow-[rgba(111,80,47,0.08)]">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
            {colorVariants.map((variant) => {
              const isActive = variant.name === selectedColor;
              return (
                <button
                  key={variant.name}
                  type="button"
                  onClick={() => handleColorChange(variant.name)}
                  aria-label={variant.name}
                  aria-pressed={isActive}
                  className={`flex h-11 w-11 flex-none items-center justify-center rounded-full transition duration-150 ease-out active:scale-90 ${
                    isActive
                      ? "ring-2 ring-[rgba(255,190,135,0.95)]"
                      : "ring-1 ring-white hover:ring-[rgba(249,166,75,0.35)]"
                  }`}
                  style={{ backgroundColor: variant.hex }}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-2 px-1">
          <h1 className="text-xl font-semibold text-[#3d2b1f] sm:text-2xl">{productName}</h1>
          <p className="text-2xl font-bold text-[#b35411]">{priceLabel}</p>
        </div>
      </div>
    </section>
  );
}
