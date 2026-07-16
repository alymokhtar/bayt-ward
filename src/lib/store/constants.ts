/** ISR revalidation interval for storefront pages (seconds) */
export const STORE_REVALIDATE_SECONDS = 60;

export const STORE_PAGE_SIZE = 24;

export const PUBLISHED_PRODUCT_WHERE = {
  publishToWebsite: true,
  isActive: true,
} as const;
