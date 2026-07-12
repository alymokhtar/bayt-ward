/**
 * Resolves the database URL from common env var names used by
 * Neon, Vercel Postgres integration, and manual .env setup.
 */
export function getDatabaseUrl(): string | undefined {
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL;

  if (!url) return undefined;

  // Normalize for Prisma + Neon pooler on serverless (Vercel)
  if (url.includes("neon.tech") && !url.includes("pgbouncer=true")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}pgbouncer=true`;
  }

  return url;
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? "bayt-ward-secret-key-2024";
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getCloudinaryCloudName(): string {
  return process.env.CLOUDINARY_CLOUD_NAME ?? "";
}

export function getCloudinaryApiKey(): string {
  return process.env.CLOUDINARY_API_KEY ?? "";
}

export function getCloudinaryApiSecret(): string {
  return process.env.CLOUDINARY_API_SECRET ?? "";
}

export function getCloudinaryUploadFolder(): string {
  return process.env.CLOUDINARY_UPLOAD_FOLDER ?? "bayt-ward/products";
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    getCloudinaryCloudName() &&
      getCloudinaryApiKey() &&
      getCloudinaryApiSecret()
  );
}
