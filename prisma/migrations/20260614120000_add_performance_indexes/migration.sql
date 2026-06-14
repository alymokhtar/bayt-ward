-- Performance indexes for foreign keys and high-traffic query patterns

-- Product
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- ProductVariant
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX "ProductVariant_isActive_stockQuantity_idx" ON "ProductVariant"("isActive", "stockQuantity");

-- Sale
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");
CREATE INDEX "Sale_userId_idx" ON "Sale"("userId");
CREATE INDEX "Sale_status_idx" ON "Sale"("status");
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");
CREATE INDEX "Sale_status_createdAt_idx" ON "Sale"("status", "createdAt");

-- SaleItem
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_variantId_idx" ON "SaleItem"("variantId");

-- Purchase
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");
CREATE INDEX "Purchase_createdAt_idx" ON "Purchase"("createdAt");
CREATE INDEX "Purchase_status_createdAt_idx" ON "Purchase"("status", "createdAt");

-- PurchaseItem
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");
CREATE INDEX "PurchaseItem_variantId_idx" ON "PurchaseItem"("variantId");

-- Return
CREATE INDEX "Return_saleId_idx" ON "Return"("saleId");
CREATE INDEX "Return_customerId_idx" ON "Return"("customerId");
CREATE INDEX "Return_userId_idx" ON "Return"("userId");
CREATE INDEX "Return_createdAt_idx" ON "Return"("createdAt");

-- ReturnItem
CREATE INDEX "ReturnItem_returnId_idx" ON "ReturnItem"("returnId");
CREATE INDEX "ReturnItem_variantId_idx" ON "ReturnItem"("variantId");

-- StockMovement
CREATE INDEX "StockMovement_variantId_idx" ON "StockMovement"("variantId");
CREATE INDEX "StockMovement_userId_idx" ON "StockMovement"("userId");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
CREATE INDEX "StockMovement_variantId_createdAt_idx" ON "StockMovement"("variantId", "createdAt");

-- Expense
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");
