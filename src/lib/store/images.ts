const CLOUDINARY_HOST = "res.cloudinary.com";

export function isCloudinaryUrl(url: string): boolean {
  try {
    return new URL(url).hostname === CLOUDINARY_HOST;
  } catch {
    return false;
  }
}

/** Apply Cloudinary transforms for optimized delivery */
export function optimizeCloudinaryUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    crop?: "fill" | "scale" | "limit";
  }
): string {
  if (!isCloudinaryUrl(url)) return url;

  const width = options?.width ?? 800;
  const height = options?.height;
  const quality = options?.quality ?? 80;
  const crop = options?.crop ?? "limit";

  const uploadMarker = "/upload/";
  const index = url.indexOf(uploadMarker);
  if (index === -1) return url;

  const prefix = url.slice(0, index + uploadMarker.length);
  const suffix = url.slice(index + uploadMarker.length);

  const transforms = [
    `f_auto`,
    `q_${quality}`,
    `c_${crop}`,
    `w_${width}`,
    ...(height ? [`h_${height}`] : []),
  ].join(",");

  return `${prefix}${transforms}/${suffix}`;
}

/** Tiny blurred placeholder for Next.js blurDataURL */
export function getCloudinaryBlurUrl(url: string): string {
  return optimizeCloudinaryUrl(url, { width: 24, quality: 20, crop: "scale" });
}

export const STORE_IMAGE_SIZES = {
  card: { width: 600, height: 750 },
  hero: { width: 1600, height: 900 },
  gallery: { width: 1200, height: 1500 },
  thumbnail: { width: 120, height: 150 },
} as const;
