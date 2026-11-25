CREATE TYPE "BookingPaymentIntentStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REVIEW');

ALTER TABLE "transactions" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "transactions_externalId_key" ON "transactions"("externalId");

CREATE TABLE "booking_payment_intents" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "voucherCode" TEXT,
    "paymentRef" TEXT NOT NULL,
    "status" "BookingPaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "receivedAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_payment_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_payment_intents_paymentRef_key" ON "booking_payment_intents"("paymentRef");
CREATE UNIQUE INDEX "booking_payment_intents_externalId_key" ON "booking_payment_intents"("externalId");
CREATE INDEX "booking_payment_intents_bookingId_status_createdAt_idx" ON "booking_payment_intents"("bookingId", "status", "createdAt");

ALTER TABLE "booking_payment_intents"
ADD CONSTRAINT "booking_payment_intents_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
