ALTER TABLE "StockMovement" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "StockMovement_idempotencyKey_key" ON "StockMovement"("idempotencyKey");
