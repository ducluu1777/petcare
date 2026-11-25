import { describe, expect, it, vi } from 'vitest';
import { AiWorkflowService } from './ai-workflow.service.js';

describe('actionable chat replies', () => {
  it('shows only real in-stock matching products and no private inventory data', async () => {
    const products = { recommend: vi.fn().mockResolvedValue([
      { id: 'ciao', name: 'Ciao Churu', slug: 'ciao', category: 'SNACK', price: 45000, stock: 3, reservedStock: 5, isActive: true },
      { id: 'gone', name: 'Other', category: 'FOOD', price: 30000, stock: 0 },
      { id: 'free', name: 'Free', category: 'SNACK', price: 0, stock: 2 },
    ]) };
    const service = new AiWorkflowService(products as any);
    const reply = await service.reply('Mua luôn Ciao Churu nhé', []);
    expect(reply?.workflow?.products).toHaveLength(1);
    expect(reply?.workflow?.products?.[0]).toMatchObject({ id: 'ciao', stock: 3, price: 45000 });
    expect(reply?.workflow?.products?.[0]).not.toHaveProperty('reservedStock');
  });
  it('stops selection without calling products or claiming an existing booking was cancelled', async () => {
    const products = { recommend: vi.fn() };
    const service = new AiWorkflowService(products as any);
    const reply = await service.reply('thôi không đặt nữa', [{ role: 'user', content: 'Muốn đặt lịch Spa' }]);
    expect(reply?.text).toContain('chưa hủy giao dịch');
    expect(reply?.workflow).toBeUndefined();
    expect(products.recommend).not.toHaveBeenCalled();
  });
  it('offers a retry without leaking database errors or inventing products', async () => {
    const products = { recommend: vi.fn().mockRejectedValue(new Error('Prisma private connection string')) };
    const service = new AiWorkflowService(products as any);
    const reply = await service.reply('mua thức ăn cho mèo', []);
    expect(reply?.text).toContain('Chưa tải được');
    expect(reply?.text).not.toContain('Prisma');
    expect(reply?.workflow?.products).toEqual([]);
  });
});
