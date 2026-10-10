CREATE TYPE "LoyaltyTransactionType" AS ENUM (
    'EARN',
    'REDEEM',
    'EARN_REVERSAL',
    'REDEEM_REVERSAL',
    'EXPIRE',
    'ADJUSTMENT'
);

ALTER TABLE "Customer"
ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Sale"
ADD COLUMN "loyaltyPointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "loyaltyPointsRedeemed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "loyaltyDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoyaltyTransaction_idempotencyKey_key"
ON "LoyaltyTransaction"("idempotencyKey");

CREATE INDEX "LoyaltyTransaction_customerId_createdAt_idx"
ON "LoyaltyTransaction"("customerId", "createdAt");

CREATE INDEX "LoyaltyTransaction_saleId_idx"
ON "LoyaltyTransaction"("saleId");

ALTER TABLE "LoyaltyTransaction"
ADD CONSTRAINT "LoyaltyTransaction_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyTransaction"
ADD CONSTRAINT "LoyaltyTransaction_saleId_fkey"
FOREIGN KEY ("saleId") REFERENCES "Sale"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
