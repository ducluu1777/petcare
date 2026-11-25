ALTER TYPE "ProductStockMovementType" ADD VALUE 'ADJUSTMENT';

ALTER TABLE "product_stock_movements"
ADD COLUMN "stockBefore" INTEGER,
ADD COLUMN "stockAfter" INTEGER,
ADD COLUMN "reason" TEXT;

UPDATE "product_stock_movements"
SET "stockBefore" = 0,
    "stockAfter" = "quantity",
    "reason" = 'Tồn đầu kỳ';

ALTER TABLE "product_stock_movements"
ALTER COLUMN "stockBefore" SET NOT NULL,
ALTER COLUMN "stockAfter" SET NOT NULL,
ALTER COLUMN "reason" SET NOT NULL;

ALTER TABLE "product_stock_movements"
ADD CONSTRAINT "product_stock_movements_stock_snapshot_check"
CHECK ("stockBefore" >= 0 AND "stockAfter" >= 0 AND "stockAfter" = "stockBefore" + "quantity");
