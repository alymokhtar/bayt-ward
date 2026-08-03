export function getDeletedVariantIds(
  existingVariantIds: string[],
  incomingVariantIds: string[],
  deletedVariantIds: string[] = []
): string[] {
  const explicitDeleted = deletedVariantIds.filter((id) => Boolean(id));
  const incomingSet = new Set(incomingVariantIds.filter((id) => Boolean(id)));
  const missingFromPayload = existingVariantIds.filter((id) => !incomingSet.has(id));

  return Array.from(new Set([...explicitDeleted, ...missingFromPayload]));
}
