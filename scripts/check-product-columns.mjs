import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const columns = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Product'
      AND column_name IN ('featuredProduct', 'publishToWebsite')
    ORDER BY column_name
  `;
  console.log("Product columns:", columns);
} catch (error) {
  console.error(error);
} finally {
  await prisma.$disconnect();
}
