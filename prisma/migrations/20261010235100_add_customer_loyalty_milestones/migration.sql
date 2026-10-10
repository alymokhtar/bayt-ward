-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN "customerId" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "customThreshold" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CustomerLoyaltyMilestone" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "thresholdAmount" DOUBLE PRECISION NOT NULL,
    "couponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLoyaltyMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLoyaltyMilestone_couponId_key" ON "CustomerLoyaltyMilestone"("couponId");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyMilestone_customerId_idx" ON "CustomerLoyaltyMilestone"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLoyaltyMilestone_customerId_level_key" ON "CustomerLoyaltyMilestone"("customerId", "level");

-- CreateIndex
CREATE INDEX "Coupon_customerId_idx" ON "Coupon"("customerId");

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyMilestone" ADD CONSTRAINT "CustomerLoyaltyMilestone_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyMilestone" ADD CONSTRAINT "CustomerLoyaltyMilestone_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
