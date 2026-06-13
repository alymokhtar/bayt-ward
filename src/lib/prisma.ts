import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = getDatabaseUrl();
  if (!url) {
    return new PrismaClient();
  }
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Reuse client across hot reloads (dev) and serverless invocations (Vercel)
globalForPrisma.prisma = prisma;
