import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('Image', 'ProductColor', 'ProductMedia')
    ORDER BY table_name
  `;
  console.log("Tables:", tables);

  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at
    FROM _prisma_migrations
    ORDER BY finished_at DESC NULLS LAST
    LIMIT 5
  `;
  console.log("Recent migrations:", migrations);
} catch (error) {
  console.error(error);
} finally {
  await prisma.$disconnect();
}
