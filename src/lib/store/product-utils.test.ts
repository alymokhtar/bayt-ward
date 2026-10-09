import assert from "node:assert/strict";
import test from "node:test";
import { getAvailableColors, getPrimaryImageUrl } from "@/lib/store/product-utils";
import type { StoreProduct } from "@/lib/store/types";

function createProductColor(
  id: string,
  productId: string,
  color: string,
  colorHex: string,
): StoreProduct["colors"][number] {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id,
    productId,
    color,
    colorHex,
    globalColorId: null,
    sortOrder: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    media: [],
  };
}

function createVariantImage(
  id: string,
  url: string,
): StoreProduct["variants"][number]["images"][number] {
  return {
    id,
    url,
    publicId: id,
    altText: null,
    sortOrder: 0,
    isPrimary: true,
    isActive: true,
  };
}

function createVariant(
  id: string,
  size: string,
  color: string,
  colorHex: string,
  stockQuantity: number,
  images: StoreProduct["variants"][number]["images"] = [],
): StoreProduct["variants"][number] {
  return {
    id,
    sku: `SKU-${id}`,
    size,
    color,
    colorHex,
    sellingPrice: color === "Blue" ? 12 : 10,
    stockQuantity,
    isActive: true,
    images,
  };
}

function createStoreProduct(
  id: string,
  colors: StoreProduct["colors"],
  variants: StoreProduct["variants"],
): StoreProduct {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id,
    name: "Test",
    nameAr: null,
    description: null,
    brand: null,
    categoryId: "c1",
    publishToWebsite: true,
    featuredProduct: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    category: { id: "c1", name: "Cat", nameAr: null },
    colors,
    variants,
    images: [],
  };
}

test("getAvailableColors excludes colors with zero stock", () => {
  const product = createStoreProduct(
    "p1",
    [
      createProductColor("pc-red", "p1", "Red", "#ff0000"),
      createProductColor("pc-blue", "p1", "Blue", "#0000ff"),
    ],
    [
      createVariant("v1", "S", "Red", "#ff0000", 0),
      createVariant("v2", "M", "Blue", "#0000ff", 2),
    ],
  );

  assert.deepEqual(getAvailableColors(product).map((color) => color.name), ["Blue"]);
});

test("getPrimaryImageUrl prefers images from in-stock variants", () => {
  const product = createStoreProduct("p2", [], [
    createVariant("v1", "S", "Red", "#ff0000", 0, [
      createVariantImage("img-out", "https://example.com/out.jpg"),
    ]),
    createVariant("v2", "M", "Blue", "#0000ff", 2, [
      createVariantImage("img-in", "https://example.com/in.jpg"),
    ]),
  ]);

  assert.equal(getPrimaryImageUrl(product), "https://example.com/in.jpg");
});
