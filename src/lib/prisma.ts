import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Reuse client across hot reloads (dev) and serverless invocations (Vercel)
globalForPrisma.prisma = prisma;
