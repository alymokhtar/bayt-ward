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
