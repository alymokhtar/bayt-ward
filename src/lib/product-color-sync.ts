import type { Prisma } from "@prisma/client";

type VariantColorInput = {
  id?: string;
  color: string;
  colorHex?: string | null;
  isActive?: boolean;
};

type PreviousVariant = {
  id: string;
  color: string;
};

function normalizeColor(color: string): string {
  return color.trim();
}

function buildDistinctColorMap(
  variants: VariantColorInput[]
): Map<string, string | null> {
  const map = new Map<string, string | null>();

  for (const variant of variants) {
    const color = normalizeColor(variant.color);
    if (!color || variant.isActive === false) continue;

    if (!map.has(color)) {
      map.set(color, variant.colorHex?.trim() || null);
    }
  }

  return map;
}

function collectColorRenames(
  variants: VariantColorInput[],
  previousVariants: PreviousVariant[]
): { from: string; to: string; colorHex: string | null }[] {
  const previousById = new Map(
    previousVariants.map((variant) => [variant.id, normalizeColor(variant.color)])
  );

  const activeColors = variants
    .filter((variant) => variant.isActive !== false)
    .map((variant) => ({
      id: variant.id,
      color: normalizeColor(variant.color),
      colorHex: variant.colorHex?.trim() || null,
    }))
    .filter((variant) => variant.color);

  const renames: { from: string; to: string; colorHex: string | null }[] = [];
  const seen = new Set<string>();

  for (const variant of activeColors) {
    if (!variant.id) continue;

    const oldColor = previousById.get(variant.id);
    const newColor = variant.color;

    if (!oldColor || oldColor === newColor) continue;

    const othersStillUseOldColor = activeColors.some(
      (entry) => entry.id !== variant.id && entry.color === oldColor
    );

    if (othersStillUseOldColor) continue;

    const key = `${oldColor}::${newColor}`;
    if (seen.has(key)) continue;

    seen.add(key);
    renames.push({
      from: oldColor,
      to: newColor,
      colorHex: variant.colorHex,
    });
  }

  return renames;
}

export async function syncProductColors(
  tx: Prisma.TransactionClient,
  productId: string,
  variants: VariantColorInput[],
  previousVariants?: PreviousVariant[]
): Promise<void> {
  if (previousVariants?.length) {
    const renames = collectColorRenames(variants, previousVariants);

    for (const rename of renames) {
      const source = await tx.productColor.findUnique({
        where: {
          productId_color: {
            productId,
            color: rename.from,
          },
        },
        select: { id: true, colorHex: true },
      });

      if (!source) continue;

      const targetExists = await tx.productColor.findUnique({
        where: {
          productId_color: {
            productId,
            color: rename.to,
          },
        },
        select: { id: true },
      });

      if (targetExists) continue;

      await tx.productColor.update({
        where: { id: source.id },
        data: {
          color: rename.to,
          colorHex: rename.colorHex ?? source.colorHex,
        },
      });
    }
  }

  const distinctColors = buildDistinctColorMap(variants);
  if (distinctColors.size === 0) return;

  const existingColors = await tx.productColor.findMany({
    where: { productId },
    select: { id: true, color: true, colorHex: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  let nextSortOrder =
    existingColors.reduce((max, color) => Math.max(max, color.sortOrder), -1) + 1;

  for (const [color, colorHex] of distinctColors) {
    const existing = await tx.productColor.findUnique({
      where: {
        productId_color: {
          productId,
          color,
        },
      },
      select: { id: true, colorHex: true },
    });

    if (existing) {
      if (colorHex && existing.colorHex !== colorHex) {
        await tx.productColor.update({
          where: { id: existing.id },
          data: { colorHex },
        });
      }
      continue;
    }

    await tx.productColor.create({
      data: {
        productId,
        color,
        colorHex,
        sortOrder: nextSortOrder,
      },
    });

    nextSortOrder += 1;
  }
}
