import assert from "node:assert/strict";
import test from "node:test";
import { getAvailableColors, getPrimaryImageUrl } from "@/lib/store/product-utils";
import type { StoreProduct } from "@/lib/store/types";

test("getAvailableColors excludes colors with zero stock", () => {
  const product = {
    id: "p1",
    name: "Test",
    nameAr: null,
    description: null,
    brand: null,
    featuredProduct: false,
    createdAt: new Date(),
    category: { id: "c1", name: "Cat", nameAr: null },
    colors: [
      { color: "Red", colorHex: "#ff0000", media: [] },
      { color: "Blue", colorHex: "#0000ff", media: [] },
    ],
    variants: [
      { id: "v1", size: "S", color: "Red", colorHex: "#ff0000", sellingPrice: 10, stockQuantity: 0, isActive: true, images: [] },
      { id: "v2", size: "M", color: "Blue", colorHex: "#0000ff", sellingPrice: 12, stockQuantity: 2, isActive: true, images: [] },
    ],
    images: [],
  } as StoreProduct;

  assert.deepEqual(getAvailableColors(product).map((color) => color.name), ["Blue"]);
});

test("getPrimaryImageUrl prefers images from in-stock variants", () => {
  const product = {
    id: "p2",
    name: "Test",
    nameAr: null,
    description: null,
    brand: null,
    featuredProduct: false,
    createdAt: new Date(),
    category: { id: "c1", name: "Cat", nameAr: null },
    colors: [],
    variants: [
      {
        id: "v1",
        size: "S",
        color: "Red",
        colorHex: "#ff0000",
        sellingPrice: 10,
        stockQuantity: 0,
        isActive: true,
        images: [{ id: "img-out", url: "https://example.com/out.jpg", altText: null, isActive: true, isPrimary: true }],
      },
      {
        id: "v2",
        size: "M",
        color: "Blue",
        colorHex: "#0000ff",
        sellingPrice: 12,
        stockQuantity: 2,
        isActive: true,
        images: [{ id: "img-in", url: "https://example.com/in.jpg", altText: null, isActive: true, isPrimary: true }],
      },
    ],
    images: [],
  } as StoreProduct;

  assert.equal(getPrimaryImageUrl(product), "https://example.com/in.jpg");
});
