ALTER TABLE "Purchase" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Purchase_idempotencyKey_key" ON "Purchase"("idempotencyKey");
