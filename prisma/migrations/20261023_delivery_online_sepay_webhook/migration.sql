ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_FAILED';

CREATE TYPE "FulfillmentMethod" AS ENUM ('PICKUP', 'DELIVERY');
CREATE TYPE "SepayWebhookEventStatus" AS ENUM ('CONFIRMED', 'REVIEW', 'IGNORED');

CREATE TABLE "delivery_areas" (
    "id" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "provinceKey" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "wardKey" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "delivery_areas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "delivery_areas_fee_nonnegative" CHECK ("fee" >= 0)
);

CREATE UNIQUE INDEX "delivery_areas_provinceKey_wardKey_key" ON "delivery_areas"("provinceKey", "wardKey");
CREATE INDEX "delivery_areas_isActive_province_ward_idx" ON "delivery_areas"("isActive", "province", "ward");

ALTER TABLE "orders"
    ADD COLUMN "fulfillmentMethod" "FulfillmentMethod" NOT NULL DEFAULT 'PICKUP',
    ADD COLUMN "deliveryAreaId" TEXT,
    ADD COLUMN "deliveryProvince" TEXT,
    ADD COLUMN "deliveryWard" TEXT,
    ADD COLUMN "deliveryAddress" TEXT,
    ADD COLUMN "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "contactName" TEXT,
    ADD COLUMN "contactPhone" TEXT,
    ADD COLUMN "paymentCode" TEXT,
    ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "orders_paymentCode_key" ON "orders"("paymentCode");
CREATE INDEX "orders_isPaid_paymentExpiresAt_idx" ON "orders"("isPaid", "paymentExpiresAt");
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliveryAreaId_fkey" FOREIGN KEY ("deliveryAreaId") REFERENCES "delivery_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "sepay_webhook_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "amount" INTEGER NOT NULL,
    "referenceCode" TEXT,
    "status" "SepayWebhookEventStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sepay_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sepay_webhook_events_status_createdAt_idx" ON "sepay_webhook_events"("status", "createdAt");
ALTER TABLE "sepay_webhook_events" ADD CONSTRAINT "sepay_webhook_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
