ALTER TABLE "Expense" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Expense_idempotencyKey_key" ON "Expense"("idempotencyKey");
