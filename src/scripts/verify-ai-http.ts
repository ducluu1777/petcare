import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).pathname !== '/petcare_ai_test_20261021') throw new Error('Chỉ chạy trên bản sao DB QA của AI.');
const db = new PrismaClient({ datasourceUrl: databaseUrl });
const origin = 'http://127.0.0.1:3001/api/v1';
let token = '';
async function request(path: string, data?: unknown, authenticated = true) {
  const response = await fetch(`${origin}${path}`, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  return { status: response.status, body: await response.json() as any };
}
try {
  const user = await db.user.create({ data: { name: 'Khách kiểm tra HTTP AI', email: `ai-http-${randomUUID()}@example.invalid`, role: 'CUSTOMER' } });
  const pet = await db.petProfile.create({ data: { userId: user.id, name: 'Mèo HTTP QA', species: 'CAT', breed: 'Mèo QA', weightKg: 3.2 } });
  // Only the dedicated capture-only QA launcher accepts this signing secret.
  token = await new JwtService().signAsync({ sub: user.id, role: 'CUSTOMER' }, { secret: 'petcare-ai-isolated-ui-test', expiresIn: '5m' });
  assert.equal((await request('/ai/booking/options', undefined, false)).status, 401);
  const options = await request('/ai/booking/options');
  assert.equal(options.status, 200, 'Cần API 3001 đang chạy launcher QA, không dùng DB gốc.');
  assert(options.body.data.pets.every((value: { id: string }) => value.id === pet.id));
  const spa = options.body.data.services.find((value: { category: string; isAddon: boolean }) => value.category === 'CAT_SPA' && !value.isAddon);
  assert(spa);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const date = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const availability = await request('/ai/booking/slots', { date, serviceIds: [spa.id] });
  assert.equal(availability.status, 201);
  const slot = availability.body.data.slots.find((value: { available: boolean; remaining: number }) => value.available && value.remaining > 0);
  assert(slot);
  const input = { petId: pet.id, serviceIds: [spa.id], startAt: `${date}T${slot.time}:00+07:00` };
  assert.equal((await request('/ai/booking/preview', { ...input, discount: 999999 })).status, 400, 'Client không được sửa giá/giảm giá.');
  const preview = await request('/ai/booking/preview', input);
  assert.equal(preview.status, 201);
  assert.equal(await db.booking.count({ where: { customerId: user.id } }), 0);
  const confirmations = await Promise.all([request('/ai/booking/confirm', { token: preview.body.data.token }), request('/ai/booking/confirm', { token: preview.body.data.token })]);
  assert(confirmations.every(value => value.status === 201));
  assert.equal(confirmations[0].body.data.id, confirmations[1].body.data.id);
  assert.equal(await db.booking.count({ where: { customerId: user.id } }), 1);
  console.log(JSON.stringify({ unauthenticatedDenied: true, onlyOwnPets: true, clientPriceRejected: true, previewDoesNotWrite: true, duplicateHttpConfirm: '2 requests / 1 booking', code: confirmations[0].body.data.code, total: confirmations[0].body.data.total }, null, 2));
} finally { await db.$disconnect(); }
