ALTER TABLE "Sale"
ADD COLUMN "appliedPromotions" JSONB NOT NULL DEFAULT '[]'::jsonb;