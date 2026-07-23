import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at, logs
    FROM _prisma_migrations
    WHERE migration_name LIKE '202607%'
    ORDER BY started_at DESC
  `;
  console.log(JSON.stringify(migrations, null, 2));
} catch (error) {
  console.error(error);
} finally {
  await prisma.$disconnect();
}
