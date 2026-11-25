ALTER TYPE "SepayWebhookEventStatus" ADD VALUE IF NOT EXISTS 'REVIEWED';

ALTER TABLE "sepay_webhook_events"
    ADD COLUMN "paymentCode" TEXT,
    ADD COLUMN "accountNumber" TEXT,
    ADD COLUMN "transferType" TEXT,
    ADD COLUMN "reviewNote" TEXT,
    ADD COLUMN "reviewedById" TEXT,
    ADD COLUMN "reviewedAt" TIMESTAMP(3);
