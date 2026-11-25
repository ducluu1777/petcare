import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Role } from '@prisma/client';
import { ServicesService } from '../modules/services/services.service.js';
import { BookingsService } from '../modules/bookings/bookings.service.js';
import { AiBookingService } from '../modules/ai-assistant/ai-booking.service.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !/(?:^|[_-])(test|testing|ci)(?:[_-]|$)/.test(new URL(databaseUrl).pathname.slice(1))) {
  throw new Error('Cần TEST_DATABASE_URL trỏ tới database test riêng; không chạy trên DB gốc.');
}
const db = new PrismaClient({ datasourceUrl: databaseUrl });
let emails = 0;
const services = new ServicesService(db as any);
const bookings = new BookingsService(db as any, services, { sendBusinessNotificationEmail: async () => { emails++; } } as any);
const ai = new AiBookingService(db as any, services, bookings, new ConfigService({ JWT_SECRET: 'isolated-ai-workflow-test' }));

try {
  const migration = await readFile('prisma/migrations/20261021_ai_booking_confirmation/migration.sql', 'utf8');
  for (const statement of migration.split(';').map(value => value.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
  const fixture = async () => {
    const user = await db.user.create({ data: { name: 'Khách thử AI', email: `ai-${randomUUID()}@example.invalid`, role: Role.CUSTOMER } });
    const pet = await db.petProfile.create({ data: { userId: user.id, name: 'Bông QA', species: 'CAT', breed: 'Mèo QA', weightKg: 3.2 } });
    return { user, pet };
  };
  const { user, pet } = await fixture();
  const main = (await services.findAll()).find(service => service.category === 'CAT_SPA' && !service.isAddon);
  assert(main, 'DB test cần có dịch vụ Spa mèo đang hoạt động.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const date = new Date(Date.parse(`${today}T00:00:00Z`) + 2 * 86400000).toISOString().slice(0, 10);
  const available = await bookings.getAvailableSlots({ date, serviceIds: [main.id] });
  const slot = available.slots.find(value => value.available && value.remaining > 0);
  assert(slot, 'Ngày test phải có khung còn chỗ.');
  const input = { petId: pet.id, serviceIds: [main.id], startAt: `${date}T${slot.time}:00+07:00` };
  const baseline = await db.booking.count({ where: { customerId: user.id } });
  const preview = await ai.prepare(user.id, input);
  assert.equal(await db.booking.count({ where: { customerId: user.id } }), baseline, 'Xem trước không tạo booking');
  const results = await Promise.all([ai.confirm(user.id, preview.token), ai.confirm(user.id, preview.token), ai.confirm(user.id, preview.token)]);
  assert.equal(new Set(results.map(value => value.id)).size, 1, 'Ba xác nhận đồng thời phải cùng một booking');
  assert.equal(await db.booking.count({ where: { customerId: user.id } }), baseline + 1);
  assert.equal(emails, 1, 'Chỉ gửi một xác nhận email');
  const other = await fixture();
  await assert.rejects(() => ai.confirm(other.user.id, preview.token));
  await assert.rejects(() => ai.prepare(other.user.id, input));
  await assert.rejects(() => ai.confirm(user.id, `${preview.token}tamper`));

  const secondSlot = available.slots.find(value => value.time !== slot.time && value.available && value.remaining > 0);
  assert(secondSlot);
  const secondInput = { ...input, startAt: `${date}T${secondSlot.time}:00+07:00` };
  const stale = await ai.prepare(user.id, secondInput);
  await db.petProfile.update({ where: { id: pet.id }, data: { weightKg: 3.3 } });
  await assert.rejects(() => ai.confirm(user.id, stale.token), /thay đổi/);
  await db.petProfile.update({ where: { id: pet.id }, data: { weightKg: 3.2 } });

  const pricePreview = await ai.prepare(user.id, secondInput);
  const pricedTier = main.priceTiers.find(tier => (!tier.species || tier.species === 'CAT') && tier.minWeight <= 3.2 && tier.maxWeight > 3.2);
  assert(pricedTier);
  try {
    await db.servicePriceTier.update({ where: { id: pricedTier.id }, data: { price: pricedTier.price + 1000 } });
    await assert.rejects(() => ai.confirm(user.id, pricePreview.token), /thay đổi/);
  } finally {
    await db.servicePriceTier.update({ where: { id: pricedTier.id }, data: { price: pricedTier.price } });
  }

  const capacityPreview = await ai.prepare(user.id, secondInput);
  const current = await bookings.getAvailableSlots({ date, serviceIds: [main.id] });
  const remaining = current.slots.find(value => value.time === secondSlot.time)!.remaining;
  for (let index = 0; index < remaining; index++) {
    const filler = await fixture();
    await bookings.bookAppointmentTx({ userId: filler.user.id, role: Role.CUSTOMER }, { ...secondInput, petId: filler.pet.id });
  }
  await assert.rejects(() => ai.confirm(user.id, capacityPreview.token), /kín chỗ/);
  assert.equal(await db.booking.count({ where: { customerId: user.id } }), baseline + 1);
  console.log(JSON.stringify({ database: new URL(databaseUrl).pathname, previewDoesNotWrite: true, concurrentReplay: '3 requests / 1 booking / 1 email', rejectsOtherOwner: true, rejectsTamper: true, rejectsChangedPet: true, rejectsChangedPrice: true, rechecksCapacity: true, booking: results[0].code }, null, 2));
} finally {
  await db.$disconnect();
}
