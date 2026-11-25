ALTER TABLE "shop_settings"
ADD COLUMN "latePickupFeeAmount" INTEGER NOT NULL DEFAULT 50000;

ALTER TABLE "bookings"
ADD COLUMN "latePickupFeeAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "latePickupFeeAssessedAt" TIMESTAMP(3),
ADD COLUMN "latePickupFeePaidAt" TIMESTAMP(3);

ALTER TABLE "transactions"
ADD COLUMN "careFeeAmount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "booking_payment_intents"
ADD COLUMN "careFeeAmount" INTEGER NOT NULL DEFAULT 0;
