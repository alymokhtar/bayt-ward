CREATE TYPE "PromotionType" AS ENUM ('BUY_X_GET_Y', 'PERCENTAGE', 'FIXED_AMOUNT');

CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromotionType" NOT NULL,
    "buyQuantity" INTEGER,
    "getQuantity" INTEGER,
    "discountPercent" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "minOrderAmount" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Promotion_type_isActive_idx" ON "Promotion"("type", "isActive");
CREATE INDEX "Promotion_startDate_endDate_idx" ON "Promotion"("startDate", "endDate");

CREATE TABLE "_CategoryToPromotion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_CategoryToPromotion_AB_unique" ON "_CategoryToPromotion"("A", "B");
CREATE INDEX "_CategoryToPromotion_B_index" ON "_CategoryToPromotion"("B");

ALTER TABLE "_CategoryToPromotion"
ADD CONSTRAINT "_CategoryToPromotion_A_fkey"
FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_CategoryToPromotion"
ADD CONSTRAINT "_CategoryToPromotion_B_fkey"
FOREIGN KEY ("B") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "_ProductToPromotion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_ProductToPromotion_AB_unique" ON "_ProductToPromotion"("A", "B");
CREATE INDEX "_ProductToPromotion_B_index" ON "_ProductToPromotion"("B");

ALTER TABLE "_ProductToPromotion"
ADD CONSTRAINT "_ProductToPromotion_A_fkey"
FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ProductToPromotion"
ADD CONSTRAINT "_ProductToPromotion_B_fkey"
FOREIGN KEY ("B") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;