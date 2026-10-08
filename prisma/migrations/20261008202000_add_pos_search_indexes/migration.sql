CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops)
  WHERE "isActive" = true;
CREATE INDEX "Product_nameAr_trgm_idx" ON "Product" USING GIN ("nameAr" gin_trgm_ops)
  WHERE "isActive" = true;
CREATE INDEX "ProductVariant_sku_trgm_idx" ON "ProductVariant" USING GIN ("sku" gin_trgm_ops)
  WHERE "isActive" = true;
CREATE INDEX "ProductVariant_barcode_trgm_idx" ON "ProductVariant" USING GIN ("barcode" gin_trgm_ops)
  WHERE "isActive" = true;
