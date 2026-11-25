import { PrismaClient, BookingStatus, BookingStatusV2 } from '@prisma/client';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: bun run scripts/backfill-bookings-v2.ts [--apply]');
  console.log('Default mode previews eligible changes without writing to the database.');
  console.log('Pass --apply to write the previewed Booking V2 values.');
  process.exit(0);
}

const unknownArgs = args.filter((arg) => arg !== '--apply');
if (unknownArgs.length > 0) {
  console.error(`[ERROR] Unknown option(s): ${unknownArgs.join(', ')}`);
  console.error('Usage: bun run scripts/backfill-bookings-v2.ts [--apply]');
  process.exit(2);
}

const applyChanges = args.includes('--apply');
const prisma = new PrismaClient();

async function backfillBookingsV2(apply: boolean) {
  console.log(`[BACKFILL] Starting Booking V2 ${apply ? 'apply' : 'preview'}...`);

  // Lịch đã qua được giữ nguyên để nhân viên rà soát; chỉ lấy lịch SPA chưa đủ dữ liệu V2.
  const bookings = await prisma.booking.findMany({
    where: {
      type: 'SPA',
      OR: [{ startAt: null }, { statusV2: null }],
    },
    include: { timeSlot: true },
  });

  console.log(`[BACKFILL] Found ${bookings.length} SPA bookings to inspect.`);

  const plannedUpdates: Array<{ id: string; code: string; startAt: Date; statusV2: BookingStatusV2 }> = [];
  let skippedCount = 0;
  const now = new Date();

  for (const booking of bookings) {
    if (!booking.timeSlot) {
      console.warn(`[WARN] Booking ${booking.code} (${booking.id}) has no timeSlot. Skipping.`);
      skippedCount++;
      continue;
    }

    const slotDateStr = booking.timeSlot.slotDate.toISOString().split('T')[0];
    const timeStr = booking.timeSlot.slotTime;
    const legacyStartAt = new Date(`${slotDateStr}T${timeStr}:00+07:00`);
    const startAt = booking.startAt ?? legacyStartAt;

    if (startAt <= now) {
      console.log(`[SKIP-PAST] Booking ${booking.code} keeps its legacy status and history.`);
      skippedCount++;
      continue;
    }

    let statusV2: BookingStatusV2;

    switch (booking.status) {
      case BookingStatus.PENDING:
      case BookingStatus.CONFIRMED:
        statusV2 = BookingStatusV2.BOOKED;
        break;
      case BookingStatus.IN_PROGRESS:
        statusV2 = BookingStatusV2.IN_SERVICE;
        break;
      case BookingStatus.READY_FOR_PICKUP:
        statusV2 = BookingStatusV2.READY_FOR_PICKUP;
        break;
      case BookingStatus.COMPLETED:
        statusV2 = BookingStatusV2.DONE;
        break;
      case BookingStatus.CANCELLED:
        statusV2 = BookingStatusV2.CANCELLED;
        break;
      default:
        throw new Error(`[FAIL-FAST] Unknown status '${String(booking.status)}' on booking ${booking.code} (${booking.id})`);
    }

    plannedUpdates.push({ id: booking.id, code: booking.code, startAt, statusV2 });
    console.log(`[${apply ? 'APPLY-PLAN' : 'PREVIEW'}] Booking ${booking.code}: startAt=${startAt.toISOString()}, statusV2=${String(statusV2)}`);
  }

  if (!apply) {
    console.log(`[PREVIEW COMPLETED] Would update ${plannedUpdates.length} bookings, skipped ${skippedCount}. No database records were changed.`);
    return;
  }

  for (const booking of plannedUpdates) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { startAt: booking.startAt, statusV2: booking.statusV2 },
    });
  }

  console.log(`[BACKFILL COMPLETED] Successfully updated ${plannedUpdates.length} bookings, skipped ${skippedCount}.`);
}

backfillBookingsV2(applyChanges)
  .catch((error) => {
    console.error('[ERROR] Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
