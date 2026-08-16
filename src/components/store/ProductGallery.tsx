"use client";

import Image from "next/image";
import { useMemo } from "react";
import { isValidImageUrl } from "@/lib/utils";

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
  activeImageIndex: number;
  onSelectColor: (color: string) => void;
  onSelectImage: (index: number) => void;
  onMainImageClick?: (index: number) => void;
};

export default function ProductGallery({
  productName,
  priceLabel,
  colorVariants,
  selectedColor,
  activeImageIndex,
  onSelectColor,
  onSelectImage,
  onMainImageClick,
}: ProductGalleryProps) {
  const selectedVariant = useMemo(
    () => colorVariants.find((variant) => variant.name === selectedColor) ?? colorVariants[0],
    [colorVariants, selectedColor]
  );

  const images = selectedVariant?.images ?? [];
  const activeImage = images[activeImageIndex] ?? images[0];
  const activeImageUrl = isValidImageUrl(activeImage?.url) ? activeImage.url : null;

  function handleColorChange(color: string) {
    onSelectColor(color);
  }

  function handleThumbnailClick(index: number) {
    onSelectImage(index);
  }

  return (
    <section key={selectedColor} className="mx-auto w-full max-w-md pb-1 md:max-w-none md:pb-6">
      <div className="overflow-hidden rounded-[1.5rem] border border-[#eadcc9] bg-[linear-gradient(180deg,#fffaf4_0%,#fef5ec_100%)] p-2.5 shadow-[0_12px_26px_rgba(87,61,39,0.08)] md:rounded-[2rem] md:p-3">
        <button
          type="button"
          onClick={() => onMainImageClick?.(activeImageIndex)}
          aria-label="تكبير الصورة"
          className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.2rem] bg-[#fff1e0] shadow-[inset_0_0_0_1px_rgba(129,96,56,0.04)] md:rounded-[1.75rem]"
        >
          {activeImageUrl ? (
            <Image
              src={activeImageUrl}
              alt={activeImage.alt || productName}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#8f7a68]">
              لا توجد صورة متاحة
            </div>
          )}
        </button>

        {images.length > 1 && (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 hide-scrollbar md:mt-3 md:gap-3">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => handleThumbnailClick(index)}
                aria-label={`عرض الصورة ${index + 1}`}
                aria-current={index === activeImageIndex}
                className={`min-w-[5rem] overflow-hidden rounded-2xl border border-transparent bg-white/80 shadow-sm transition duration-150 ease-out hover:border-[rgba(249,166,75,0.5)] hover:shadow-md ${
                  index === activeImageIndex ? "ring-2 ring-[rgba(255,190,135,0.85)]" : ""
                } active:scale-95`}
              >
                <div className="relative h-20 w-full">
                  {isValidImageUrl(image.url) ? (
                    <Image
                      src={image.url}
                      alt={image.alt || productName}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl bg-[#fff1e0] text-xs text-[#8f7a68]">
                      لا توجد صورة
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-2.5 rounded-[1.2rem] border border-[#f0e2d3] bg-white/90 px-2.5 py-2 shadow-[0_4px_12px_rgba(92,63,33,0.04)] md:mt-3 md:rounded-[1.75rem] md:px-3 md:py-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5 py-0.5 md:justify-start">
            {colorVariants.map((variant) => {
              const isActive = variant.name === selectedColor;
              return (
                <button
                  key={variant.name}
                  type="button"
                  onClick={() => handleColorChange(variant.name)}
                  aria-label={variant.name}
                  aria-pressed={isActive}
                  className={`flex h-6 w-6 min-w-[1.5rem] min-h-[1.5rem] flex-none items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm transition duration-150 ease-out active:scale-90 ${
                    isActive
                      ? "border-[3px] border-[#b35411] ring-2 ring-[rgba(255,190,135,0.95)] ring-offset-1 ring-offset-white shadow-md"
                      : "border-gray-300 hover:border-[rgba(179,84,17,0.5)] hover:shadow-md"
                  }`}
                  style={{ backgroundColor: variant.hex }}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-2 px-1 md:mt-4 md:block md:space-y-2">
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 text-base font-semibold leading-6 text-[#3d2b1f] sm:text-2xl md:text-xl md:leading-7">{productName}</h1>
          </div>
          <p className="shrink-0 text-lg font-black tracking-tight text-[#b35411] md:text-2xl">{priceLabel}</p>
        </div>
      </div>
    </section>
  );
}
