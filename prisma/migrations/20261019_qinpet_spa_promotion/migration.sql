ALTER TABLE "shop_settings"
ADD COLUMN "qinpetSpaPromotionActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "bookings"
ADD COLUMN "qinpetSpaPromotionEligible" BOOLEAN NOT NULL DEFAULT false;

UPDATE "shop_settings"
SET "openHours" = '{"1":{"open":"08:30","close":"18:30"},"2":{"open":"08:30","close":"18:30"},"3":{"open":"08:30","close":"18:30"},"4":{"open":"08:30","close":"18:30"},"5":{"open":"08:30","close":"18:30"},"6":{"open":"08:30","close":"18:30"},"7":{"open":"08:30","close":"18:30"}}'::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'singleton'
  AND "openHours" = '{"1":{"open":"08:00","close":"21:00"},"2":{"open":"08:00","close":"21:00"},"3":{"open":"08:00","close":"21:00"},"4":{"open":"08:00","close":"21:00"},"5":{"open":"08:00","close":"21:00"},"6":{"open":"08:00","close":"21:00"},"7":{"open":"08:00","close":"21:00"}}'::jsonb;
