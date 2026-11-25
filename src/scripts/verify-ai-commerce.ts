import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).pathname !== '/petcare_ai_test_20261021') {
  throw new Error('Chỉ chạy luồng mua hàng trên DB QA riêng của AI.');
}
const db = new PrismaClient({ datasourceUrl: databaseUrl });
const origin = 'http://127.0.0.1:3001/api/v1';
let token = '';

async function request(path: string, data?: unknown) {
  const response = await fetch(`${origin}${path}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(15000),
  });
  const envelope = await response.json();
  return { status: response.status, data: envelope.data ?? envelope };
}

try {
  const user = await db.user.create({ data: {
    name: 'Khách QA mua hàng từ chat', email: `ai-commerce-${randomUUID()}@example.invalid`, role: 'CUSTOMER',
  } });
  // The original API rejects this secret and this user exists only in the test DB.
  token = await new JwtService().signAsync({ sub: user.id, role: 'CUSTOMER' }, {
    secret: 'petcare-ai-isolated-ui-test', expiresIn: '5m',
  });
  assert.equal((await request('/ai/booking/options')).status, 200, 'Cần API đang chạy launcher QA, không dùng DB gốc.');
  const chat = await request('/ai/chat', { message: 'Mình muốn mua bánh thưởng cho mèo' });
  assert.equal(chat.status, 201);
  assert.equal(chat.data.workflow?.kind, 'products');
  const choice = chat.data.workflow.products.find((product: { stock: number; price: number }) => product.stock > 0 && product.price > 0);
  assert(choice, 'Cần sản phẩm thật còn hàng trong DB QA.');
  const fresh = await request(`/products/${encodeURIComponent(choice.slug)}`);
  assert.equal(fresh.status, 200);
  assert.equal(fresh.data.id, choice.id);
  assert.equal(Number(fresh.data.price), choice.price);
  assert.equal(await db.order.count({ where: { customerId: user.id } }), 0, 'Tư vấn/chọn hàng chưa được tạo đơn.');

  const input = { items: [{ productId: choice.id, quantity: 1 }], paymentMethod: 'BANK_TRANSFER', note: 'QA từ chat, không chuyển tiền thật' };
  assert.equal((await request('/orders', { ...input, total: 1 })).status, 400, 'Khách không được tự sửa tổng tiền.');
  const stockBefore = await db.product.findUniqueOrThrow({ where: { id: choice.id }, select: { stock: true } });
  const pointsBefore = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { loyaltyPoints: true } });
  const created = await request('/orders', input);
  assert.equal(created.status, 201);
  const order = await db.order.findUniqueOrThrow({ where: { id: created.data.id }, include: { items: true } });
  assert.equal(order.customerId, user.id);
  assert.equal(Number(order.total), choice.price);
  assert.equal(order.isPaid, false);
  assert.equal(order.status, 'PENDING');
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].productId, choice.id);
  assert.equal(order.items[0].quantity, 1);
  assert.equal(await db.order.count({ where: { customerId: user.id } }), 1);
  const stockAfter = await db.product.findUniqueOrThrow({ where: { id: choice.id }, select: { stock: true } });
  assert.equal(stockAfter.stock, stockBefore.stock - 1);
  const pointsAfter = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { loyaltyPoints: true } });
  assert.equal(pointsAfter.loyaltyPoints, pointsBefore.loyaltyPoints, 'Đơn chưa hoàn tất không được cộng điểm.');
  console.log(JSON.stringify({
    adviceDoesNotCreateOrder: true, liveProductAndPrice: true, clientTotalRejected: true,
    checkoutCreatedExactlyOneUnpaidOrder: true, inventoryDecreasedOnce: true, noPrematurePoints: true,
    code: order.code, total: Number(order.total),
  }, null, 2));
} finally {
  await db.$disconnect();
}
