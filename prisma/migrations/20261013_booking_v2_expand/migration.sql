-- CreateEnum
CREATE TYPE "BookingStatusV2" AS ENUM ('BOOKED', 'IN_SERVICE', 'DONE', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEB', 'RECEPTIONIST', 'WALK_IN');

-- AlterTable
ALTER TABLE "booking_services" ADD COLUMN     "durationMin" INTEGER,
ADD COLUMN     "sizeTierId" TEXT;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "createdByStaffId" TEXT,
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "extraMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "extraPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'WEB',
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "statusV2" "BookingStatusV2";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "noShowCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "size_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minKg" DOUBLE PRECISION NOT NULL,
    "maxKg" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "size_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_prices" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "sizeTierId" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "priceFrom" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_settings" (
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
    "openHours" JSONB NOT NULL,
    "holidays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_logs" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatusV2",
    "toStatus" "BookingStatusV2" NOT NULL,
    "action" TEXT NOT NULL,
    "staffId" TEXT,
    "reason" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_prices_serviceId_sizeTierId_key" ON "service_prices"("serviceId", "sizeTierId");

-- CreateIndex
CREATE INDEX "booking_status_logs_bookingId_createdAt_idx" ON "booking_status_logs"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "bookings_statusV2_startAt_endAt_idx" ON "bookings"("statusV2", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "bookings_customerId_startAt_idx" ON "bookings"("customerId", "startAt");

-- AddForeignKey
ALTER TABLE "service_prices" ADD CONSTRAINT "service_prices_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_prices" ADD CONSTRAINT "service_prices_sizeTierId_fkey" FOREIGN KEY ("sizeTierId") REFERENCES "size_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_sizeTierId_fkey" FOREIGN KEY ("sizeTierId") REFERENCES "size_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_logs" ADD CONSTRAINT "booking_status_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Custom Check Constraints (RFC-001 Revision 3)
ALTER TABLE "bookings" ADD CONSTRAINT "chk_booking_extra_min" CHECK ("extraMin" >= 0);
ALTER TABLE "users" ADD CONSTRAINT "chk_user_no_show_count" CHECK ("noShowCount" >= 0);
