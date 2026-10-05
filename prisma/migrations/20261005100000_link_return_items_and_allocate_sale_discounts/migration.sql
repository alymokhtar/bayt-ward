UPDATE "Sale"
SET "discountAmount" = ROUND("discountAmount"::numeric * 100) / 100;

WITH line_amounts AS (
  SELECT
    si.id,
    si."saleId",
    ROUND(si."unitPrice" * si.quantity * 100)::bigint AS line_cents,
    ROUND(GREATEST(s."discountAmount", 0) * 100)::bigint AS requested_discount_cents,
    SUM(ROUND(si."unitPrice" * si.quantity * 100)::bigint)
      OVER (PARTITION BY si."saleId") AS gross_cents
  FROM "SaleItem" si
  INNER JOIN "Sale" s ON s.id = si."saleId"
), capped_discounts AS (
  SELECT
    *,
    LEAST(requested_discount_cents, gross_cents) AS discount_cents
  FROM line_amounts
), shares AS (
  SELECT
    *,
    CASE
      WHEN gross_cents > 0
        THEN FLOOR(discount_cents::numeric * line_cents / gross_cents)::bigint
      ELSE 0
    END AS base_discount_cents,
    CASE
      WHEN gross_cents > 0
        THEN MOD(discount_cents::numeric * line_cents, gross_cents::numeric)
      ELSE 0
    END AS fractional_remainder
  FROM capped_discounts
), ranked_shares AS (
  SELECT
    *,
    discount_cents - SUM(base_discount_cents) OVER (PARTITION BY "saleId") AS remaining_cents,
    ROW_NUMBER() OVER (
      PARTITION BY "saleId"
      ORDER BY fractional_remainder DESC, id
    ) AS remainder_rank
  FROM shares
)
UPDATE "SaleItem" AS si
SET "discountAmount" = (
  ranked_shares.base_discount_cents
  + CASE WHEN ranked_shares.remainder_rank <= ranked_shares.remaining_cents THEN 1 ELSE 0 END
) / 100.0,
"totalPrice" = (
  ranked_shares.line_cents
  - ranked_shares.base_discount_cents
  - CASE WHEN ranked_shares.remainder_rank <= ranked_shares.remaining_cents THEN 1 ELSE 0 END
) / 100.0
FROM ranked_shares
WHERE ranked_shares.id = si.id;

UPDATE "Sale" AS s
SET "subtotal" = totals.subtotal,
    "discountAmount" = totals.discount,
    "totalAmount" = totals.total
FROM (
  SELECT
    "saleId",
    COALESCE(SUM(ROUND("unitPrice"::numeric * quantity * 100)), 0) / 100 AS subtotal,
    COALESCE(SUM(ROUND("discountAmount"::numeric * 100)), 0) / 100 AS discount,
    COALESCE(SUM(ROUND("totalPrice"::numeric * 100)), 0) / 100 AS total
  FROM "SaleItem"
  GROUP BY "saleId"
) AS totals
WHERE totals."saleId" = s.id;

ALTER TABLE "ReturnItem"
ADD COLUMN "saleItemId" TEXT;

UPDATE "ReturnItem" AS ri
SET "saleItemId" = (
  SELECT si.id
  FROM "Return" AS r
  INNER JOIN "SaleItem" AS si
    ON si."saleId" = r."saleId"
   AND si."variantId" = ri."variantId"
  WHERE r.id = ri."returnId"
  ORDER BY si.id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM "Return" AS r
  INNER JOIN "SaleItem" AS si
    ON si."saleId" = r."saleId"
   AND si."variantId" = ri."variantId"
  WHERE r.id = ri."returnId"
);

ALTER TABLE "ReturnItem"
ADD CONSTRAINT "ReturnItem_saleItemId_fkey"
FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"(id)
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ReturnItem_saleItemId_idx" ON "ReturnItem"("saleItemId");