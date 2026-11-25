import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveImageToDevice } from './save-image-to-device';

const originalFetch = globalThis.fetch;
const originalNavigator = globalThis.navigator;

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: originalNavigator });
  vi.restoreAllMocks();
});

describe('saveImageToDevice', () => {
  it('shares the downloaded image file when the device supports image sharing', async () => {
    globalThis.fetch = vi.fn(async () => new Response(new Blob(['qr-image'], { type: 'image/png' }))) as typeof fetch;
    const share = vi.fn(async () => undefined);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { canShare: vi.fn(() => true), share },
    });

    await expect(saveImageToDevice('https://example.test/qr.png', 'petcare-order.png')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Mã QR thanh toán PetCare',
      files: [expect.objectContaining({ name: 'petcare-order.png', type: 'image/png' })],
    }));
  });

  it('reports an image load error without invoking share', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 500 })) as typeof fetch;
    const share = vi.fn(async () => undefined);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { canShare: vi.fn(() => true), share },
    });

    await expect(saveImageToDevice('https://example.test/qr.png', 'petcare-order.png')).rejects.toThrow('Không thể tải ảnh mã QR.');
    expect(share).not.toHaveBeenCalled();
  });
});
