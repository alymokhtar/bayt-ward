import type { Prisma } from "@prisma/client";

type VariantColorInput = {
  id?: string;
  color: string;
  colorHex?: string | null;
  globalColorId?: string | null;
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
): Map<string, { colorHex: string | null; globalColorId?: string | null }> {
  const map = new Map<
    string,
    { colorHex: string | null; globalColorId?: string | null }
  >();

  for (const variant of variants) {
    const color = normalizeColor(variant.color);
    if (!color || variant.isActive === false) continue;

    if (!map.has(color)) {
      map.set(color, {
        colorHex: variant.colorHex?.trim() || null,
        globalColorId: variant.globalColorId,
      });
      continue;
    }

    const existing = map.get(color)!;
    if (
      variant.globalColorId &&
      existing.globalColorId &&
      variant.globalColorId !== existing.globalColorId
    ) {
      throw new Error("لا يمكن ربط الاسم نفسه بأكثر من لون مركزي");
    }
    if (!existing.globalColorId && variant.globalColorId) {
      existing.globalColorId = variant.globalColorId;
    }
    if (!existing.colorHex && variant.colorHex?.trim()) {
      existing.colorHex = variant.colorHex.trim();
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
  const existingColors = await tx.productColor.findMany({
    where: { productId },
    select: { id: true, color: true, colorHex: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  const colorsByName = new Map(
    existingColors.map((color) => [color.color, color])
  );
  if (previousVariants?.length) {
    const renames = collectColorRenames(variants, previousVariants);
    const renamePromises: Promise<unknown>[] = [];

    for (const rename of renames) {
      const source = colorsByName.get(rename.from);
      if (!source) continue;
      if (colorsByName.has(rename.to)) continue;

      const updatedHex = rename.colorHex ?? source.colorHex;
      renamePromises.push(
        tx.productColor.update({
          where: { id: source.id },
          data: {
            color: rename.to,
            colorHex: updatedHex,
          },
        })
      );

      colorsByName.delete(rename.from);
      colorsByName.set(rename.to, {
        ...source,
        color: rename.to,
        colorHex: updatedHex,
      });
    }

    if (renamePromises.length > 0) {
      await Promise.all(renamePromises);
    }
  }

  const distinctColors = buildDistinctColorMap(variants);
  if (distinctColors.size === 0) return;

  let nextSortOrder =
    existingColors.reduce((max, color) => Math.max(max, color.sortOrder), -1) + 1;

  const updatePromises: Promise<unknown>[] = [];
  const createData: Array<{
    productId: string;
    color: string;
    colorHex: string | null;
    globalColorId: string | null;
    sortOrder: number;
  }> = [];

  for (const [color, colorData] of distinctColors) {
    const existing = colorsByName.get(color);
    if (existing) {
      const updateData: {
        colorHex?: string | null;
        globalColorId?: string | null;
      } = {};
      if (colorData.colorHex !== existing.colorHex) {
        updateData.colorHex = colorData.colorHex;
      }
      if (colorData.globalColorId !== undefined) {
        updateData.globalColorId = colorData.globalColorId;
      }
      if (Object.keys(updateData).length > 0) {
        updatePromises.push(
          tx.productColor.update({
            where: { id: existing.id },
            data: updateData,
          })
        );
      }
      continue;
    }

    createData.push({
      productId,
      color,
      colorHex: colorData.colorHex,
      globalColorId: colorData.globalColorId ?? null,
      sortOrder: nextSortOrder,
    });
    nextSortOrder += 1;
  }

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }

  if (createData.length > 0) {
    await tx.productColor.createMany({ data: createData });
  }
}
