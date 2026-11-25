import { describe, expect, it } from 'bun:test';
import { chatBookingReceipt, chatProductToCart, validateChatCartSelection } from './ai-workflow';
const product = { id: 'food', name: 'Thức ăn', slug: 'thuc-an', category: 'FOOD', description: '', price: 45000, stock: 3, imageUrl: null };

describe('chat cart confirmation', () => {
  it('validates live price and available stock including quantities already in cart', () => {
    expect(validateChatCartSelection(product, 2, 1, 45000)).toBeNull();
    expect(validateChatCartSelection(product, 3, 1, 45000)).toContain('chỉ còn 2');
    expect(validateChatCartSelection({ ...product, price: 50000 }, 1, 0, 45000)).toContain('Giá vừa thay đổi');
  });
  it('rejects invalid quantity, free products and inactive listings', () => {
    for (const quantity of [0, -1, 1.5, 100, NaN]) expect(validateChatCartSelection(product, quantity, 0)).not.toBeNull();
    expect(validateChatCartSelection({ ...product, price: 0 }, 1, 0)).not.toBeNull();
    expect(validateChatCartSelection({ ...product, isActive: false }, 1, 0)).not.toBeNull();
    expect(chatProductToCart(product)).toMatchObject({ category: 'food', price: 45000, id: 'food' });
  });
});

describe('chat booking receipt', () => {
  const receipt = { code: 'BK-QA', startAt: '2026-10-23T09:00:00+07:00', total: 220000, status: 'BOOKED' };
  it('reports confirmed booking and payment at pickup', () => {
    expect(chatBookingReceipt(receipt, 'Bông')).toContain('Đặt lịch thành công');
    expect(chatBookingReceipt(receipt, 'Bông')).toContain('220.000đ');
    expect(chatBookingReceipt(receipt, 'Bông')).toContain('Thanh toán tại quầy');
  });
  it('does not present a cancelled replay as a newly successful booking', () => {
    const text = chatBookingReceipt({ ...receipt, status: 'CANCELLED' }, 'Bông');
    expect(text).toContain('Đã hủy');
    expect(text).not.toContain('Đặt lịch thành công');
    expect(text).toContain('không tạo thêm lịch');
  });
});
