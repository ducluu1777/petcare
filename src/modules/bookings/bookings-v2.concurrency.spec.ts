import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  BookingSource,
  BookingStatusV2,
  PrismaClient,
  Role,
} from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ServicesService } from '../services/services.service.js';
import { BookingsService } from './bookings.service.js';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const testRunId = randomUUID();

if (TEST_DATABASE_URL) {
  let databaseName = '';
  try {
    databaseName = decodeURIComponent(new URL(TEST_DATABASE_URL).pathname.slice(1)).toLowerCase();
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (!/(?:^|[_-])(test|testing|ci)(?:[_-]|$)/.test(databaseName)) {
    throw new Error('PostgreSQL integration tests require a dedicated test or CI database.');
  }
}

const describeWithTestDatabase = TEST_DATABASE_URL ? describe : describe.skip;

describeWithTestDatabase('Bookings V2 - Concurrency, Peak Algorithm & Dedicated Postgres Tests', () => {
  let prisma: PrismaClient;
  let service: BookingsService;
  let originalShopSettings: {
    capacity: number;
    webCapacity: number | null;
    bufferMin: number;
    maxAdvanceDays: number;
  } | null = null;

  // Test setup IDs
  let customerUser1: any;
  let customerUser2: any;
  let customerUser3: any;
  let staffUser: any;
  let testPet1: any;
  let testPet2: any;
  let testPet3: any;
  let spaService: any;
  let bypassUserId: string | undefined;
  let bypassPetId: string | undefined;

  const TEST_DATE_1 = '2026-12-01';
  const TEST_DATE_2 = '2026-12-02';

  beforeAll(async () => {
    // Never fall back to DATABASE_URL: this suite writes and deletes fixture data.
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL! } } });
    await prisma.$connect();
    originalShopSettings = await prisma.shopSettings.findUnique({
      where: { id: 'singleton' },
      select: { capacity: true, webCapacity: true, bufferMin: true, maxAdvanceDays: true },
    });
    if (!originalShopSettings) {
      throw new Error('The dedicated test database must contain the singleton shop settings row.');
    }

    const prismaService = prisma as unknown as PrismaService;
    const servicesService = new ServicesService(prismaService);
    service = new BookingsService(prismaService, servicesService);

    // 1. Tạo fixture riêng cho lần chạy; không tái sử dụng/xóa dữ liệu có sẵn.
    customerUser1 = await prisma.user.create({
      data: {
        email: `test_cust_1_${testRunId}@petcare.test`,
        name: 'Test Customer 1',
        phone: null,
        role: Role.CUSTOMER,
      },
    });

    customerUser2 = await prisma.user.create({
      data: {
        email: `test_cust_2_${testRunId}@petcare.test`,
        name: 'Test Customer 2',
        phone: null,
        role: Role.CUSTOMER,
      },
    });

    customerUser3 = await prisma.user.create({
      data: {
        email: `test_cust_3_${testRunId}@petcare.test`,
        name: 'Test Customer 3',
        phone: null,
        role: Role.CUSTOMER,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        email: `test_staff_${testRunId}@petcare.test`,
        name: 'Test Staff',
        phone: null,
        role: Role.STAFF,
      },
    });

    // 2. Thú cưng
    testPet1 = await prisma.petProfile.create({
      data: {
        userId: customerUser1.id,
        name: 'Test Pet 1',
        species: 'DOG',
        breed: 'Poodle',
        weightKg: 3.5, // Small tier
      },
    });

    testPet2 = await prisma.petProfile.create({
      data: {
        userId: customerUser2.id,
        name: 'Test Pet 2',
        species: 'DOG',
        breed: 'Poodle',
        weightKg: 4.0, // Small tier
      },
    });

    testPet3 = await prisma.petProfile.create({
      data: {
        userId: customerUser3.id,
        name: 'Test Pet 3',
        species: 'DOG',
        breed: 'Poodle',
        weightKg: 4.5, // Small tier
      },
    });

    // 3. Service
    spaService = await prisma.service.findFirst({
      where: { slug: 'tam-spa-thao-moc' },
    });
    expect(spaService).toBeDefined();

  });

  afterAll(async () => {
    try {
      const fixtureUserIds = [
        customerUser1?.id,
        customerUser2?.id,
        customerUser3?.id,
        staffUser?.id,
        bypassUserId,
      ].filter((id): id is string => typeof id === 'string');
      const fixturePetIds = [testPet1?.id, testPet2?.id, testPet3?.id, bypassPetId]
        .filter((id): id is string => typeof id === 'string');
      const fixtureBookings = fixturePetIds.length
        ? await prisma.booking.findMany({
            where: { petId: { in: fixturePetIds } },
            select: { id: true },
          })
        : [];
      const fixtureBookingIds = fixtureBookings.map(({ id }) => id);

      if (fixtureBookingIds.length) {
        await prisma.bookingStatusLog.deleteMany({
          where: { bookingId: { in: fixtureBookingIds } },
        });
        await prisma.booking.deleteMany({
          where: { id: { in: fixtureBookingIds } },
        });
      }
      if (fixturePetIds.length) {
        await prisma.petProfile.deleteMany({
          where: { id: { in: fixturePetIds } },
        });
      }
      if (fixtureUserIds.length) {
        await prisma.notification.deleteMany({
          where: { userId: { in: fixtureUserIds } },
        });
        await prisma.auditLog.deleteMany({
          where: {
            OR: [
              { performedById: { in: fixtureUserIds } },
              { targetUserId: { in: fixtureUserIds } },
            ],
          },
        });
        await prisma.user.deleteMany({
          where: { id: { in: fixtureUserIds } },
        });
      }
      expect(await prisma.booking.count({ where: { petId: { in: fixturePetIds } } })).toBe(0);
      expect(await prisma.petProfile.count({ where: { id: { in: fixturePetIds } } })).toBe(0);
      expect(await prisma.user.count({ where: { id: { in: fixtureUserIds } } })).toBe(0);
    } finally {
      try {
        if (originalShopSettings) {
          await prisma.shopSettings.update({
            where: { id: 'singleton' },
            data: originalShopSettings,
          });
        }
      } finally {
        await prisma.$disconnect();
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST CASE 1: CONCURRENCY PEAK TEST (Promise.all 6 requests trên N = 3)
  // ───────────────────────────────────────────────────────────────────────────
  it('Case 1: Six concurrent requests in one start slot yield three bookings at capacity three', async () => {
    // Tạm cấu hình shop_settings: capacity = 3, webCapacity = null
    await prisma.shopSettings.update({
      where: { id: 'singleton' },
      data: { capacity: 3, webCapacity: null, maxAdvanceDays: 90 },
    });

    const targetTime = `${TEST_DATE_1}T09:00:00+07:00`;

    // Chuẩn bị 6 request từ các customer khác nhau
    const requests = [
      service.bookAppointmentTx(
        { userId: customerUser1.id, role: Role.CUSTOMER },
        { petId: testPet1.id, serviceIds: [spaService.id], startAt: targetTime },
      ),
      service.bookAppointmentTx(
        { userId: customerUser2.id, role: Role.CUSTOMER },
        { petId: testPet2.id, serviceIds: [spaService.id], startAt: targetTime },
      ),
      service.bookAppointmentTx(
        { userId: customerUser3.id, role: Role.CUSTOMER },
        { petId: testPet3.id, serviceIds: [spaService.id], startAt: targetTime },
      ),
      service.bookAppointmentTx(
        { userId: customerUser1.id, role: Role.CUSTOMER },
        { petId: testPet1.id, serviceIds: [spaService.id], startAt: targetTime },
      ),
      service.bookAppointmentTx(
        { userId: customerUser2.id, role: Role.CUSTOMER },
        { petId: testPet2.id, serviceIds: [spaService.id], startAt: targetTime },
      ),
      service.bookAppointmentTx(
        { userId: customerUser3.id, role: Role.CUSTOMER },
        { petId: testPet3.id, serviceIds: [spaService.id], startAt: targetTime },
      ),
    ];

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(3);
    expect(rejected.length).toBe(3);

    // Kiểm tra rejected đều là ConflictException (409)
    for (const rej of rejected) {
      expect((rej as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
    }

    // Kiểm tra số lượng trong database thực tế không quá 3
    const activeBookingsCount = await prisma.booking.count({
      where: {
        type: 'SPA',
        statusV2: 'BOOKED',
        startAt: new Date(targetTime),
      },
    });
    expect(activeBookingsCount).toBe(3);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST CASE 2: HALF-OPEN INTERVAL TEST (Nối đuôi nhau không tính chồng)
  // ───────────────────────────────────────────────────────────────────────────
  it('Case 2: Two adjacent start slots remain independent when capacity is 1', async () => {
    // Công suất tính theo giờ bắt đầu, không phụ thuộc lịch trước đã hoàn tất hay chưa.
    await prisma.shopSettings.update({
      where: { id: 'singleton' },
      data: { capacity: 1, webCapacity: null, bufferMin: 15 },
    });

    const timeA = `${TEST_DATE_1}T15:00:00+07:00`;
    const bookingA = await service.bookAppointmentTx(
      { userId: customerUser1.id, role: Role.CUSTOMER },
      { petId: testPet1.id, serviceIds: [spaService.id], startAt: timeA },
    );
    expect(bookingA).toBeDefined();

    const timeB = `${TEST_DATE_1}T15:30:00+07:00`;
    const bookingB = await service.bookAppointmentTx(
      { userId: customerUser2.id, role: Role.CUSTOMER },
      { petId: testPet2.id, serviceIds: [spaService.id], startAt: timeB },
    );
    expect(bookingB).toBeDefined();
    expect(bookingA.startAt!.getTime()).not.toBe(bookingB.startAt!.getTime());
    expect(bookingA.endAt).toBeNull();
    expect(bookingB.endAt).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST CASE 3: WALK-IN GIỜ LẺ (PEAK POINT TEST)
  // ───────────────────────────────────────────────────────────────────────────
  it('Case 3: Walk-in giờ lẻ - Phát hiện quá tải chính xác tại mốc giờ lẻ', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TEST_DATE_1}T16:07:00+07:00`));

    try {
    await prisma.shopSettings.update({
      where: { id: 'singleton' },
      data: { capacity: 2, webCapacity: null },
    });

    const baseTime1 = `${TEST_DATE_1}T16:30:00+07:00`;
    const baseTime2 = `${TEST_DATE_1}T16:30:00+07:00`;

    // Hai booking đã dùng hết khung 16:30.
    await service.bookAppointmentTx(
      { userId: staffUser.id, role: Role.STAFF },
      { petId: testPet1.id, customerId: customerUser1.id, serviceIds: [spaService.id], startAt: baseTime1, source: BookingSource.RECEPTIONIST },
    );
    await service.bookAppointmentTx(
      { userId: staffUser.id, role: Role.STAFF },
      { petId: testPet2.id, customerId: customerUser2.id, serviceIds: [spaService.id], startAt: baseTime2, source: BookingSource.RECEPTIONIST },
    );

    // Walk-in thực tế lúc 16:07 được lưu theo giờ đến, nhưng tính công suất vào 16:30.
    await expect(
      service.bookAppointmentTx(
        { userId: staffUser.id, role: Role.STAFF },
        { petId: testPet3.id, customerId: customerUser3.id, serviceIds: [spaService.id], source: BookingSource.WALK_IN },
      ),
    ).rejects.toThrow(ConflictException);
    } finally {
      vi.useRealTimers();
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST CASE 4: RESCHEDULE TEST (Không tự chồng chính mình)
  // ───────────────────────────────────────────────────────────────────────────
  it('Case 4: Reschedule Test - Đổi giờ một ca không bị tự tính là chồng lấn với chính nó qua excludeBookingId', async () => {
    await prisma.shopSettings.update({
      where: { id: 'singleton' },
      data: { capacity: 1, webCapacity: null },
    });

    const initialTime = `${TEST_DATE_2}T09:00:00+07:00`;
    const booking = await service.bookAppointmentTx(
      { userId: staffUser.id, role: Role.STAFF },
      { petId: testPet1.id, serviceIds: [spaService.id], startAt: initialTime, customerId: customerUser1.id },
    );

    // Đổi sang 10:00 cùng ngày (với N=1, ca cũ phải được loại trừ nếu dịch chuyển)
    const rescheduled = await service.rescheduleAppointmentTx(
      booking.id,
      { userId: staffUser.id, role: Role.STAFF },
      { newStartAt: `${TEST_DATE_2}T10:00:00+07:00` },
    );

    expect(rescheduled).toBeDefined();
    expect(rescheduled.startAt).toBeDefined();
    // 10:00 VN (+07:00) tương ứng 03:00 UTC
    expect(rescheduled.startAt?.toISOString()).toContain('03:00:00');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST CASE 5: OVERDUE IN_SERVICE TEST (Ca quá giờ vẫn chiếm trạm)
  // ───────────────────────────────────────────────────────────────────────────
  it('Case 5: An in-service booking in the prior start slot does not reduce the next slot capacity', async () => {
    await prisma.shopSettings.update({
      where: { id: 'singleton' },
      data: { capacity: 1, webCapacity: null },
    });

    const ongoingBooking = await service.bookAppointmentTx(
      { userId: staffUser.id, role: Role.STAFF },
      {
        petId: testPet1.id,
        customerId: customerUser1.id,
        serviceIds: [spaService.id],
        startAt: `${TEST_DATE_1}T17:00:00+07:00`,
        source: BookingSource.RECEPTIONIST,
      },
    );
    await prisma.booking.update({
      where: { id: ongoingBooking.id },
      data: { statusV2: BookingStatusV2.IN_SERVICE },
    });

    const nextSlotBooking = await service.bookAppointmentTx(
      { userId: staffUser.id, role: Role.STAFF },
      {
        petId: testPet2.id,
        customerId: customerUser2.id,
        serviceIds: [spaService.id],
        startAt: `${TEST_DATE_1}T17:30:00+07:00`,
        source: BookingSource.RECEPTIONIST,
      },
    );

    expect(nextSlotBooking).toBeDefined();
    expect(nextSlotBooking.endAt).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST CASE 6: DEADLOCK PREVENTION TEST (Khóa chéo 2 ngày có thứ tự)
  // ───────────────────────────────────────────────────────────────────────────
  it('Case 6: Deadlock Prevention Test - Đổi giờ chéo 2 ngày song song hoàn tất tuần tự không bị deadlock', async () => {
    await prisma.shopSettings.update({
      where: { id: 'singleton' },
      data: { capacity: 5, webCapacity: null },
    });

    const b1 = await service.bookAppointmentTx(
      { userId: staffUser.id, role: Role.STAFF },
      { petId: testPet1.id, serviceIds: [spaService.id], startAt: `${TEST_DATE_1}T10:00:00+07:00`, customerId: customerUser1.id },
    );

    const b2 = await service.bookAppointmentTx(
      { userId: staffUser.id, role: Role.STAFF },
      { petId: testPet2.id, serviceIds: [spaService.id], startAt: `${TEST_DATE_2}T10:00:00+07:00`, customerId: customerUser2.id },
    );

    // Request 1: Đổi b1 từ Ngày 1 sang Ngày 2
    // Request 2: Đổi b2 từ Ngày 2 sang Ngày 1
    // Cả 2 bắn đồng thời bằng Promise.all
    const [res1, res2] = await Promise.all([
      service.rescheduleAppointmentTx(
        b1.id,
        { userId: staffUser.id, role: Role.STAFF },
        { newStartAt: `${TEST_DATE_2}T11:00:00+07:00` },
      ),
      service.rescheduleAppointmentTx(
        b2.id,
        { userId: staffUser.id, role: Role.STAFF },
        { newStartAt: `${TEST_DATE_1}T11:00:00+07:00` },
      ),
    ]);

    expect(res1).toBeDefined();
    expect(res2).toBeDefined();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST CASE 7: CONDITIONAL UPDATE & DOUBLE CLICK DONE TEST
  // ───────────────────────────────────────────────────────────────────────────
  it('Case 7: Two receptionists completing a paid booking concurrently changes state once and does not add points twice', async () => {
    const booking = await service.bookAppointmentTx(
      { userId: staffUser.id, role: Role.STAFF },
      { petId: testPet1.id, serviceIds: [spaService.id], startAt: `${TEST_DATE_2}T15:30:00+07:00`, customerId: customerUser1.id },
    );

    const pointsAwardedAtPayment = Math.floor(booking.total / 10000);
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        statusV2: BookingStatusV2.READY_FOR_PICKUP,
        isPaid: true,
        pointsAwarded: pointsAwardedAtPayment,
      },
    });
    await prisma.user.update({
      where: { id: customerUser1.id },
      data: { loyaltyPoints: { increment: pointsAwardedAtPayment } },
    });
    const paidBalance = (await prisma.user.findUnique({ where: { id: customerUser1.id } }))?.loyaltyPoints ?? 0;

    // 2 lễ tân bấm DONE đồng thời
    const results = await Promise.allSettled([
      service.changeStatusV2(
        booking.id,
        { userId: staffUser.id, role: Role.STAFF },
        { fromStatus: BookingStatusV2.READY_FOR_PICKUP, toStatus: BookingStatusV2.DONE },
      ),
      service.changeStatusV2(
        booking.id,
        { userId: staffUser.id, role: Role.STAFF },
        { fromStatus: BookingStatusV2.READY_FOR_PICKUP, toStatus: BookingStatusV2.DONE },
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

    // Điểm đã được cộng khi thu tiền; chuyển trạng thái không cộng lại.
    const updatedUser = await prisma.user.findUnique({ where: { id: customerUser1.id } });
    expect(updatedUser?.loyaltyPoints).toBe(paidBalance);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST CASE 8: TRUST BOUNDARY BYPASS TEST
  // ───────────────────────────────────────────────────────────────────────────
  it('Case 8: Trust Boundary Bypass Test - Khách web gửi source: RECEPTIONIST, force: true bị server ghi đè và chặn khi đầy chỗ', async () => {
    await prisma.shopSettings.update({
      where: { id: 'singleton' },
      data: { capacity: 1, webCapacity: null },
    });

    const bypassUser = await prisma.user.upsert({
      where: { email: 'bypass_tester@petcare.test' },
      update: {},
      create: {
        email: 'bypass_tester@petcare.test',
        name: 'Bypass Tester',
        phone: '0911999999',
        role: Role.CUSTOMER,
      },
    });
    bypassUserId = bypassUser.id;

    const bypassPet = await prisma.petProfile.upsert({
      where: { id: 'test-pet-bypass' },
      update: {},
      create: {
        id: 'test-pet-bypass',
        userId: bypassUser.id,
        name: 'Bypass Pet',
        species: 'DOG',
        breed: 'Poodle',
        weightKg: 3.5,
      },
    });
    bypassPetId = bypassPet.id;

    const targetTime = `${TEST_DATE_2}T16:00:00+07:00`;

    // 1 ca đã chiếm chỗ lúc 16:00
    await service.bookAppointmentTx(
      { userId: staffUser.id, role: Role.STAFF },
      { petId: testPet1.id, serviceIds: [spaService.id], startAt: targetTime, customerId: customerUser1.id },
    );

    // Khách web cố tình gửi fake source và force
    await expect(
      service.bookAppointmentTx(
        { userId: bypassUser.id, role: Role.CUSTOMER },
        {
          petId: bypassPet.id,
          serviceIds: [spaService.id],
          startAt: targetTime,
          source: BookingSource.RECEPTIONIST, // Cố tình giả mạo
          force: true, // Cố tình bật cờ vượt chỗ
        },
      ),
    ).rejects.toThrow(ConflictException);
  });
});
