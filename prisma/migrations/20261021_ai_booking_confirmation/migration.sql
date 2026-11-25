ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "aiConfirmationId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_aiConfirmationId_key" ON "bookings"("aiConfirmationId");
