-- Bring the existing core weight-priced catalog in line with the approved 20 kg limit.
-- This migration is intentionally not applied to any database as part of this change.

DELETE FROM "service_price_tiers" AS tier
USING "services" AS service
WHERE tier."serviceId" = service."id"
  AND service."slug" IN ('tam-spa-thao-moc', 'combo-cat-tia-grooming')
  AND tier."minWeight" >= 20;

UPDATE "service_price_tiers" AS tier
SET "maxWeight" = 20,
    "label" = CONCAT(
      'Từ ',
      CASE
        WHEN tier."minWeight" = TRUNC(tier."minWeight") THEN TRUNC(tier."minWeight")::int::text
        ELSE tier."minWeight"::text
      END,
      ' kg đến tối đa 20 kg'
    )
FROM "services" AS service
WHERE tier."serviceId" = service."id"
  AND service."slug" IN ('tam-spa-thao-moc', 'combo-cat-tia-grooming')
  AND tier."minWeight" < 20
  AND tier."maxWeight" > 20;

UPDATE "service_price_tiers" AS tier
SET "maxWeight" = 20,
    "label" = 'Từ 4 kg đến tối đa 20 kg'
FROM "services" AS service
WHERE tier."serviceId" = service."id"
  AND service."slug" = 'tam-spa-meo-chuyen-sau'
  AND tier."minWeight" = 4
  AND tier."maxWeight" = 15;

DELETE FROM "service_price_tiers" AS tier
USING "services" AS service
WHERE tier."serviceId" = service."id"
  AND service."isAddon" = TRUE
  AND tier."minWeight" >= 20;

UPDATE "service_price_tiers" AS tier
SET "maxWeight" = 20,
    "label" = CONCAT(
      'Từ ',
      CASE
        WHEN tier."minWeight" = TRUNC(tier."minWeight") THEN TRUNC(tier."minWeight")::int::text
        ELSE tier."minWeight"::text
      END,
      ' kg đến tối đa 20 kg'
    )
FROM "services" AS service
WHERE tier."serviceId" = service."id"
  AND service."isAddon" = TRUE
  AND tier."minWeight" < 20
  AND tier."maxWeight" > 20;
