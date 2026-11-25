import { afterEach, describe, expect, it } from 'bun:test';
import { apiClient } from './api-client';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('API error messages', () => {
  it('preserves validation messages returned as a list in the API envelope', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({
      success: false, error: { code: 'BAD_REQUEST', message: ['Nhập mô tả sản phẩm.', 'Chọn danh mục.'] },
    }), { status: 400, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
    await expect(apiClient.post('/products', {})).rejects.toMatchObject({
      status: 400, code: 'BAD_REQUEST', message: 'Nhập mô tả sản phẩm.\nChọn danh mục.',
    });
  });
  it('supports standard Nest validation responses and ignores non-text entries', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({
      statusCode: 400, message: [null, {}, 'Nhập số nguyên dương.'],
    }), { status: 400, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
    await expect(apiClient.post('/products', {})).rejects.toMatchObject({ message: 'Nhập số nguyên dương.' });
  });
  it('keeps existing text errors', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: { message: 'Sản phẩm đã ngừng bán.' } }), {
      status: 409, headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
    await expect(apiClient.post('/products', {})).rejects.toMatchObject({ message: 'Sản phẩm đã ngừng bán.' });
  });
  it('uses a safe fallback for non-JSON responses', async () => {
    globalThis.fetch = (async () => new Response('Upstream unavailable', { status: 503 })) as typeof fetch;
    await expect(apiClient.post('/products', {})).rejects.toMatchObject({ message: 'Yêu cầu thất bại với mã lỗi HTTP 503' });
  });
});
