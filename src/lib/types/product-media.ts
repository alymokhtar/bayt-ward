export type ProductMediaItem = {
  id: string;
  url: string;
  publicId: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  isActive: boolean;
};

export type ProductColorWithMedia = {
  id: string;
  color: string;
  colorHex: string | null;
  sortOrder: number;
  isActive: boolean;
  media: ProductMediaItem[];
};

export type ProductListMediaSummary = {
  thumbnailUrl: string | null;
  imageCount: number;
};
