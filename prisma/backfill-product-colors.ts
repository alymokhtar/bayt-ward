import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type DistinctColor = {
  color: string;
  colorHex: string | null;
};

function normalizeColor(color: string): string {
  return color.trim();
}

async function getDistinctColors(productId: string): Promise<DistinctColor[]> {
  const variants = await prisma.productVariant.findMany({
    where: { productId, color: { not: "" } },
    select: { color: true, colorHex: true },
    orderBy: [{ color: "asc" }, { createdAt: "asc" }],
  });

  const seen = new Set<string>();
  const colors: DistinctColor[] = [];

  for (const variant of variants) {
    const color = normalizeColor(variant.color);
    if (!color || seen.has(color)) continue;

    seen.add(color);
    colors.push({
      color,
      colorHex: variant.colorHex?.trim() || null,
    });
  }

  return colors;
}

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let colorsCreated = 0;
  let productsSkipped = 0;

  for (const product of products) {
    const existingColors = await prisma.productColor.count({
      where: { productId: product.id },
    });

    if (existingColors > 0) {
      productsSkipped += 1;
      continue;
    }

    const distinctColors = await getDistinctColors(product.id);

    if (distinctColors.length === 0) {
      continue;
    }

    const createdColors = await prisma.$transaction(
      distinctColors.map((entry, index) =>
        prisma.productColor.create({
          data: {
            productId: product.id,
            color: entry.color,
            colorHex: entry.colorHex,
            sortOrder: index,
          },
          select: { id: true },
        })
      )
    );

    colorsCreated += createdColors.length;

  }

  console.log("✅ Product color backfill completed");
  console.log(`Products processed: ${products.length}`);
  console.log(`Products skipped (already had colors): ${productsSkipped}`);
  console.log(`ProductColor rows created: ${colorsCreated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
