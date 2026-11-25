ALTER TABLE "sepay_webhook_events"
    ADD COLUMN "bookingId" TEXT;

CREATE INDEX "sepay_webhook_events_bookingId_idx"
ON "sepay_webhook_events"("bookingId");

ALTER TABLE "sepay_webhook_events"
ADD CONSTRAINT "sepay_webhook_events_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
