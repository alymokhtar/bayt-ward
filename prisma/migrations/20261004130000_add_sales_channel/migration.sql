CREATE TYPE "SalesChannel" AS ENUM ('POS', 'ONLINE');

ALTER TABLE "Sale"
ADD COLUMN "channel" "SalesChannel" NOT NULL DEFAULT 'POS';