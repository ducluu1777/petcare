CREATE TABLE "bank_transfer_references" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "orderId" TEXT,
    "bookingPaymentIntentId" TEXT,
    "orderPaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transfer_references_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bank_transfer_references_reference_key"
ON "bank_transfer_references"("reference");

CREATE INDEX "bank_transfer_references_orderId_createdAt_idx"
ON "bank_transfer_references"("orderId", "createdAt");

CREATE INDEX "bank_transfer_references_bookingPaymentIntentId_idx"
ON "bank_transfer_references"("bookingPaymentIntentId");

CREATE INDEX "bank_transfer_references_orderPaymentIntentId_idx"
ON "bank_transfer_references"("orderPaymentIntentId");

ALTER TABLE "bank_transfer_references"
ADD CONSTRAINT "bank_transfer_references_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bank_transfer_references"
ADD CONSTRAINT "bank_transfer_references_bookingPaymentIntentId_fkey"
FOREIGN KEY ("bookingPaymentIntentId") REFERENCES "booking_payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bank_transfer_references"
ADD CONSTRAINT "bank_transfer_references_orderPaymentIntentId_fkey"
FOREIGN KEY ("orderPaymentIntentId") REFERENCES "order_payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
