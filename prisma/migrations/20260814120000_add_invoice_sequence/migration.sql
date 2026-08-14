-- CreateTable InvoiceSequence
-- This table maintains atomic sequence counters for invoice generation
-- preventing race conditions and duplicate invoice numbers
CREATE TABLE "InvoiceSequence" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on unique combination of prefix and dateKey
-- Ensures only one sequence record per prefix per day
CREATE UNIQUE INDEX "InvoiceSequence_prefix_dateKey_key" ON "InvoiceSequence"("prefix", "dateKey");

-- CreateIndex for querying by prefix
CREATE INDEX "InvoiceSequence_prefix_idx" ON "InvoiceSequence"("prefix");

-- CreateIndex for querying by dateKey
CREATE INDEX "InvoiceSequence_dateKey_idx" ON "InvoiceSequence"("dateKey");
