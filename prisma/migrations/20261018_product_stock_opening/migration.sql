CREATE TYPE "ProductStockMovementType" AS ENUM ('OPENING_BALANCE');

CREATE TABLE "product_stock_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "ProductStockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_stock_movements_productId_createdAt_idx"
ON "product_stock_movements"("productId", "createdAt");

CREATE INDEX "product_stock_movements_performedById_createdAt_idx"
ON "product_stock_movements"("performedById", "createdAt");

ALTER TABLE "product_stock_movements"
ADD CONSTRAINT "product_stock_movements_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_stock_movements"
ADD CONSTRAINT "product_stock_movements_performedById_fkey"
FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
