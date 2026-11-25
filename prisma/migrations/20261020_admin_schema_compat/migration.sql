-- Reconcile the original Docker database with the current Admin schema.
-- This is intentionally additive: legacy columns, foreign keys, enum values,
-- transactions, and all service_price_tiers rows remain available.

BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'BookingStatusV2') THEN
    CREATE TYPE public."BookingStatusV2" AS ENUM ('BOOKED', 'ARRIVED', 'IN_SERVICE', 'READY_FOR_PICKUP', 'DONE', 'CANCELLED', 'NO_SHOW');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'BookingSource') THEN
    CREATE TYPE public."BookingSource" AS ENUM ('WEB', 'RECEPTIONIST', 'WALK_IN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'BookingPaymentIntentStatus') THEN
    CREATE TYPE public."BookingPaymentIntentStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REVIEW');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'OrderSource') THEN
    CREATE TYPE public."OrderSource" AS ENUM ('ONLINE', 'IN_STORE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'ProductStockMovementType') THEN
    CREATE TYPE public."ProductStockMovementType" AS ENUM ('OPENING_BALANCE', 'ADJUSTMENT');
  END IF;
END $$;

ALTER TABLE public."users"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "noShowCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE public."services"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public."products"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "reservedStock" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public."pet_profiles"
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

ALTER TABLE public."booking_services"
  ADD COLUMN IF NOT EXISTS "durationMin" INTEGER,
  ADD COLUMN IF NOT EXISTS "sizeTierId" TEXT;

ALTER TABLE public."bookings"
  ADD COLUMN IF NOT EXISTS "createdByStaffId" TEXT,
  ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "extraMin" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "extraPrice" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "latePickupFeeAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "latePickupFeeAssessedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "latePickupFeePaidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "qinpetSpaPromotionEligible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "source" public."BookingSource" NOT NULL DEFAULT 'WEB',
  ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "statusV2" public."BookingStatusV2";

ALTER TABLE public."orders"
  ALTER COLUMN "customerId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "source" public."OrderSource" NOT NULL DEFAULT 'ONLINE';

ALTER TABLE public."transactions"
  ALTER COLUMN "bookingId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "careFeeAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "confirmedById" TEXT,
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "orderId" TEXT,
  ADD COLUMN IF NOT EXISTS "receivedAmount" INTEGER;

ALTER TABLE public."vouchers"
  ADD COLUMN IF NOT EXISTS "usageLimitPerUser" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public."reviews"
  ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "moderatedById" TEXT,
  ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;

CREATE TABLE IF NOT EXISTS public."audit_logs" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "performedById" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "details" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."size_tiers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "minKg" DOUBLE PRECISION NOT NULL,
  "maxKg" DOUBLE PRECISION NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "size_tiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."service_prices" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "sizeTierId" TEXT NOT NULL,
  "durationMin" INTEGER NOT NULL,
  "priceFrom" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "service_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."shop_settings" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "capacity" INTEGER NOT NULL DEFAULT 3,
  "webCapacity" INTEGER,
  "bufferMin" INTEGER NOT NULL DEFAULT 15,
  "slotStepMin" INTEGER NOT NULL DEFAULT 30,
  "minNoticeHours" INTEGER NOT NULL DEFAULT 2,
  "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30,
  "cancelBeforeHours" INTEGER NOT NULL DEFAULT 4,
  "noShowGraceMin" INTEGER NOT NULL DEFAULT 20,
  "noShowWarnCount" INTEGER NOT NULL DEFAULT 3,
  "qinpetSpaPromotionActive" BOOLEAN NOT NULL DEFAULT true,
  "latePickupFeeAmount" INTEGER NOT NULL DEFAULT 50000,
  "openHours" JSONB NOT NULL,
  "holidays" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."booking_status_logs" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "fromStatus" public."BookingStatusV2",
  "toStatus" public."BookingStatusV2" NOT NULL,
  "action" TEXT NOT NULL,
  "staffId" TEXT,
  "reason" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_status_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."booking_payment_intents" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "careFeeAmount" INTEGER NOT NULL DEFAULT 0,
  "voucherCode" TEXT,
  "paymentRef" TEXT NOT NULL,
  "status" public."BookingPaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
  "externalId" TEXT,
  "receivedAmount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_payment_intents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."product_stock_movements" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" public."ProductStockMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "stockBefore" INTEGER NOT NULL,
  "stockAfter" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "performedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."order_payment_intents" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "paymentRef" TEXT NOT NULL,
  "status" public."BookingPaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
  "externalId" TEXT,
  "receivedAmount" INTEGER,
  "confirmedById" TEXT,
  "excessRefunded" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "order_payment_intents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."bank_transfer_references" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "orderId" TEXT,
  "bookingPaymentIntentId" TEXT,
  "orderPaymentIntentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bank_transfer_references_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "service_prices_serviceId_sizeTierId_key" ON public."service_prices"("serviceId", "sizeTierId");
CREATE INDEX IF NOT EXISTS "booking_status_logs_bookingId_createdAt_idx" ON public."booking_status_logs"("bookingId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "booking_payment_intents_paymentRef_key" ON public."booking_payment_intents"("paymentRef");
CREATE UNIQUE INDEX IF NOT EXISTS "booking_payment_intents_externalId_key" ON public."booking_payment_intents"("externalId");
CREATE INDEX IF NOT EXISTS "booking_payment_intents_bookingId_status_createdAt_idx" ON public."booking_payment_intents"("bookingId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "product_stock_movements_productId_createdAt_idx" ON public."product_stock_movements"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "product_stock_movements_performedById_createdAt_idx" ON public."product_stock_movements"("performedById", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "order_payment_intents_paymentRef_key" ON public."order_payment_intents"("paymentRef");
CREATE UNIQUE INDEX IF NOT EXISTS "order_payment_intents_externalId_key" ON public."order_payment_intents"("externalId");
CREATE INDEX IF NOT EXISTS "order_payment_intents_status_expiresAt_idx" ON public."order_payment_intents"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "order_payment_intents_orderId_createdAt_idx" ON public."order_payment_intents"("orderId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "bank_transfer_references_reference_key" ON public."bank_transfer_references"("reference");
CREATE INDEX IF NOT EXISTS "bank_transfer_references_orderId_createdAt_idx" ON public."bank_transfer_references"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "bank_transfer_references_bookingPaymentIntentId_idx" ON public."bank_transfer_references"("bookingPaymentIntentId");
CREATE INDEX IF NOT EXISTS "bank_transfer_references_orderPaymentIntentId_idx" ON public."bank_transfer_references"("orderPaymentIntentId");
CREATE INDEX IF NOT EXISTS "bookings_statusV2_startAt_endAt_idx" ON public."bookings"("statusV2", "startAt", "endAt");
CREATE INDEX IF NOT EXISTS "bookings_customerId_startAt_idx" ON public."bookings"("customerId", "startAt");
CREATE INDEX IF NOT EXISTS "reviews_isHidden_createdAt_idx" ON public."reviews"("isHidden", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_externalId_key" ON public."transactions"("externalId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.audit_logs'::regclass AND conname = 'audit_logs_performedById_fkey') THEN
    ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES public."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.audit_logs'::regclass AND conname = 'audit_logs_targetUserId_fkey') THEN
    ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES public."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.service_prices'::regclass AND conname = 'service_prices_serviceId_fkey') THEN
    ALTER TABLE public."service_prices" ADD CONSTRAINT "service_prices_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.service_prices'::regclass AND conname = 'service_prices_sizeTierId_fkey') THEN
    ALTER TABLE public."service_prices" ADD CONSTRAINT "service_prices_sizeTierId_fkey" FOREIGN KEY ("sizeTierId") REFERENCES public."size_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.booking_services'::regclass AND conname = 'booking_services_sizeTierId_fkey') THEN
    ALTER TABLE public."booking_services" ADD CONSTRAINT "booking_services_sizeTierId_fkey" FOREIGN KEY ("sizeTierId") REFERENCES public."size_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.booking_status_logs'::regclass AND conname = 'booking_status_logs_bookingId_fkey') THEN
    ALTER TABLE public."booking_status_logs" ADD CONSTRAINT "booking_status_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.transactions'::regclass AND conname = 'transactions_orderId_fkey') THEN
    ALTER TABLE public."transactions" ADD CONSTRAINT "transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.transactions'::regclass AND conname = 'transactions_confirmedById_fkey') THEN
    ALTER TABLE public."transactions" ADD CONSTRAINT "transactions_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES public."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.booking_payment_intents'::regclass AND conname = 'booking_payment_intents_bookingId_fkey') THEN
    ALTER TABLE public."booking_payment_intents" ADD CONSTRAINT "booking_payment_intents_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.product_stock_movements'::regclass AND conname = 'product_stock_movements_productId_fkey') THEN
    ALTER TABLE public."product_stock_movements" ADD CONSTRAINT "product_stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.product_stock_movements'::regclass AND conname = 'product_stock_movements_performedById_fkey') THEN
    ALTER TABLE public."product_stock_movements" ADD CONSTRAINT "product_stock_movements_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES public."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.order_payment_intents'::regclass AND conname = 'order_payment_intents_orderId_fkey') THEN
    ALTER TABLE public."order_payment_intents" ADD CONSTRAINT "order_payment_intents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.order_payment_intents'::regclass AND conname = 'order_payment_intents_confirmedById_fkey') THEN
    ALTER TABLE public."order_payment_intents" ADD CONSTRAINT "order_payment_intents_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES public."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.bank_transfer_references'::regclass AND conname = 'bank_transfer_references_orderId_fkey') THEN
    ALTER TABLE public."bank_transfer_references" ADD CONSTRAINT "bank_transfer_references_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.bank_transfer_references'::regclass AND conname = 'bank_transfer_references_bookingPaymentIntentId_fkey') THEN
    ALTER TABLE public."bank_transfer_references" ADD CONSTRAINT "bank_transfer_references_bookingPaymentIntentId_fkey" FOREIGN KEY ("bookingPaymentIntentId") REFERENCES public."booking_payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.bank_transfer_references'::regclass AND conname = 'bank_transfer_references_orderPaymentIntentId_fkey') THEN
    ALTER TABLE public."bank_transfer_references" ADD CONSTRAINT "bank_transfer_references_orderPaymentIntentId_fkey" FOREIGN KEY ("orderPaymentIntentId") REFERENCES public."order_payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.reviews'::regclass AND conname = 'reviews_moderatedById_fkey') THEN
    ALTER TABLE public."reviews" ADD CONSTRAINT "reviews_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES public."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.bookings'::regclass AND conname = 'chk_booking_extra_min') THEN
    ALTER TABLE public."bookings" ADD CONSTRAINT "chk_booking_extra_min" CHECK ("extraMin" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.users'::regclass AND conname = 'chk_user_no_show_count') THEN
    ALTER TABLE public."users" ADD CONSTRAINT "chk_user_no_show_count" CHECK ("noShowCount" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.product_stock_movements'::regclass AND conname = 'product_stock_movements_stock_snapshot_check') THEN
    ALTER TABLE public."product_stock_movements" ADD CONSTRAINT "product_stock_movements_stock_snapshot_check" CHECK ("stockBefore" >= 0 AND "stockAfter" >= 0 AND "stockAfter" = "stockBefore" + "quantity");
  END IF;
END $$;

-- Keep the species-specific source pricing in service_price_tiers unchanged.
-- These size rows are only the booking's shared weight-band snapshot.
INSERT INTO public."size_tiers" ("id", "name", "minKg", "maxKg", "sortOrder", "active") VALUES
  ('tier-small', 'Nhỏ', 0, 5, 1, true),
  ('tier-medium', 'Vừa', 5, 10, 2, true),
  ('tier-large', 'Lớn', 10, 20, 3, true)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO public."shop_settings" (
  "id", "capacity", "webCapacity", "bufferMin", "slotStepMin", "minNoticeHours",
  "maxAdvanceDays", "cancelBeforeHours", "noShowGraceMin", "noShowWarnCount",
  "qinpetSpaPromotionActive", "latePickupFeeAmount", "openHours", "holidays", "updatedAt"
) VALUES (
  'singleton', 3, NULL, 15, 30, 2, 30, 4, 20, 3, true, 50000,
  '{"1":{"open":"08:30","close":"18:30"},"2":{"open":"08:30","close":"18:30"},"3":{"open":"08:30","close":"18:30"},"4":{"open":"08:30","close":"18:30"},"5":{"open":"08:30","close":"18:30"},"6":{"open":"08:30","close":"18:30"},"7":{"open":"08:30","close":"18:30"}}'::jsonb,
  ARRAY[]::TEXT[], CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

COMMIT;
