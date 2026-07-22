import type { Prisma } from "@prisma/client";

export const storeProductInclude = {
  category: {
    select: { id: true, name: true, nameAr: true },
  },
  colors: {
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    include: {
      media: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
        select: {
          id: true,
          url: true,
          publicId: true,
          altText: true,
          sortOrder: true,
          isPrimary: true,
          isActive: true,
        },
      },
    },
  },
  variants: {
    where: { isActive: true },
    orderBy: [{ size: "asc" as const }, { color: "asc" as const }],
    select: {
      id: true,
      size: true,
      color: true,
      colorHex: true,
      sellingPrice: true,
      stockQuantity: true,
      isActive: true,
      images: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
        select: {
          id: true,
          url: true,
          publicId: true,
          altText: true,
          sortOrder: true,
          isPrimary: true,
          isActive: true,
        },
      },
    },
  },
  images: {
    where: { isActive: true, productVariantId: null },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    select: {
      id: true,
      url: true,
      publicId: true,
      altText: true,
      sortOrder: true,
      isPrimary: true,
      isActive: true,
    },
  },
} satisfies Prisma.ProductInclude;

export type StoreProduct = Prisma.ProductGetPayload<{
  include: typeof storeProductInclude;
}>;

export type StoreProductListItem = Pick<
  StoreProduct,
  | "id"
  | "name"
  | "nameAr"
  | "description"
  | "brand"
  | "imageUrl"
  | "featuredProduct"
  | "createdAt"
  | "images"
> & {
  category: StoreProduct["category"];
  colors: StoreProduct["colors"];
  variants: StoreProduct["variants"];
};

export type StoreCategory = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  _count: { products: number };
};
