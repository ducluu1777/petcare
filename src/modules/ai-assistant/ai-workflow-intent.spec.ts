import { describe, expect, it } from 'vitest';
import { planAiWorkflow } from './ai-workflow-intent.js';

describe('chat action intent', () => {
  it('keeps product preferences across short answers and replaces the current species', () => {
    expect(planAiWorkflow('mèo 3,2kg', [{ role: 'user', content: 'Mình cần mua thức ăn cho bé' }])).toMatchObject({ kind: 'products', species: 'CAT', weightKg: 3.2, category: 'FOOD' });
    expect(planAiWorkflow('mua hạt cho chó', [{ role: 'user', content: 'mua thức ăn mèo' }])).toMatchObject({ species: 'DOG' });
  });
  it('opens booking choices and understands tomorrow in Vietnam', () => {
    const plan = planAiWorkflow('mai nhé', [{ role: 'user', content: 'Muốn đặt lịch tắm mèo' }], new Date('2026-10-21T18:00:00Z'));
    expect(plan).toMatchObject({ kind: 'booking', species: 'CAT', date: '2026-10-23' });
  });
  it('answers booking price questions without opening the booking workflow', () => {
    expect(planAiWorkflow('Giá dịch vụ hiển thị khi đặt lịch đã là giá cuối cùng chưa?', [])).toBeNull();
    expect(planAiWorkflow('Mình muốn đặt lịch tắm mèo', [])).toMatchObject({ kind: 'booking', species: 'CAT' });
  });
  it('recognizes a named product purchase and does not reopen a declined or unrelated task', () => {
    expect(planAiWorkflow('Mua luôn Ciao Churu nhé', [])).toMatchObject({ kind: 'products', search: 'Ciao Churu' });
    const history = [{ role: 'user', content: 'Mình muốn mua thức ăn cho mèo' }];
    expect(planAiWorkflow('thôi không mua nữa', history)).toBeNull();
    expect(planAiWorkflow('thời tiết hôm nay thế nào?', history)).toBeNull();
  });
  it('does not revive an old workflow through unrelated messages or a cancellation', () => {
    const shopping = { role: 'user', content: 'Mình muốn mua thức ăn cho mèo' };
    expect(planAiWorkflow('cửa hàng ở đâu', [shopping])).toBeNull();
    expect(planAiWorkflow('mình đang đi làm', [shopping])).toBeNull();
    expect(planAiWorkflow('mèo', [shopping, { role: 'user', content: 'thôi không mua nữa' }])).toBeNull();
    expect(planAiWorkflow('3kg', [shopping, { role: 'user', content: 'cửa hàng ở đâu' }])).toBeNull();
  });
  it('carries corrections within one task and takes the last product category', () => {
    expect(planAiWorkflow('bánh thưởng nhé', [{ role: 'user', content: 'mua thức ăn cho mèo 3kg' }]))
      .toMatchObject({ kind: 'products', species: 'CAT', weightKg: 3, category: 'SNACK' });
    expect(planAiWorkflow('4kg nhé', [{ role: 'user', content: 'mua hạt cho mèo 3kg' }]))
      .toMatchObject({ kind: 'products', species: 'CAT', weightKg: 4 });
  });
  it.each(['hello', 'cần gặp nhân viên', 'hủy lịch như thế nào', 'Spa chữa bệnh không?', 'Bé bị tiêu chảy nên mua gì?', 'đổi voucher', 'nhân viên cân lại thế nào?'])('does not replace existing social, support, policy or veterinary handling: %s', message => {
    expect(planAiWorkflow(message, [])).toBeNull();
  });
});
