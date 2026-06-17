-- CreateEnum
CREATE TYPE "EmployeeAdjustmentType" AS ENUM ('ADVANCE', 'DEDUCTION', 'ABSENCE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "salary" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "employeeId" TEXT,
ADD COLUMN "baseSalary" DOUBLE PRECISION,
ADD COLUMN "deductionsTotal" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "EmployeeAdjustment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "EmployeeAdjustmentType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "adjustmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeAdjustment_userId_settled_idx" ON "EmployeeAdjustment"("userId", "settled");

-- CreateIndex
CREATE INDEX "EmployeeAdjustment_expenseId_idx" ON "EmployeeAdjustment"("expenseId");

-- CreateIndex
CREATE INDEX "Expense_employeeId_idx" ON "Expense"("employeeId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdjustment" ADD CONSTRAINT "EmployeeAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdjustment" ADD CONSTRAINT "EmployeeAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdjustment" ADD CONSTRAINT "EmployeeAdjustment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
