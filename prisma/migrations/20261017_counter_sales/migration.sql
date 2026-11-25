CREATE TYPE "OrderSource" AS ENUM ('ONLINE', 'IN_STORE');

ALTER TABLE "products"
ADD COLUMN "reservedStock" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "orders"
ALTER COLUMN "customerId" DROP NOT NULL,
ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'ONLINE';

CREATE TABLE "order_payment_intents" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentRef" TEXT NOT NULL,
    "status" "BookingPaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "receivedAmount" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_payment_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_payment_intents_paymentRef_key" ON "order_payment_intents"("paymentRef");
CREATE UNIQUE INDEX "order_payment_intents_externalId_key" ON "order_payment_intents"("externalId");
CREATE INDEX "order_payment_intents_status_expiresAt_idx" ON "order_payment_intents"("status", "expiresAt");
CREATE INDEX "order_payment_intents_orderId_createdAt_idx" ON "order_payment_intents"("orderId", "createdAt");

ALTER TABLE "order_payment_intents"
ADD CONSTRAINT "order_payment_intents_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transactions"
ALTER COLUMN "bookingId" DROP NOT NULL,
ADD COLUMN "orderId" TEXT,
ADD COLUMN "note" TEXT;

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "transactions_orderId_idx" ON "transactions"("orderId");
