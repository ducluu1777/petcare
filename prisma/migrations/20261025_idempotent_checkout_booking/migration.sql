ALTER TABLE "orders"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "idempotencyHash" TEXT;

CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "orders"("idempotencyKey");

ALTER TABLE "bookings"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "idempotencyHash" TEXT;

CREATE UNIQUE INDEX "bookings_idempotencyKey_key" ON "bookings"("idempotencyKey");
