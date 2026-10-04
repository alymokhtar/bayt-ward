ALTER TABLE "SaleItem"
ADD COLUMN "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "SaleItem" AS si
SET "costPrice" = COALESCE(pv."costPrice", 0)
FROM "ProductVariant" AS pv
WHERE pv.id = si."variantId";

ALTER TABLE "ReturnItem"
ADD COLUMN "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "ReturnItem" AS ri
SET "costPrice" = COALESCE(
  (
    SELECT si."costPrice"
    FROM "Return" AS r
    INNER JOIN "SaleItem" AS si
      ON si."saleId" = r."saleId"
     AND si."variantId" = ri."variantId"
    WHERE r.id = ri."returnId"
    LIMIT 1
  ),
  0
);