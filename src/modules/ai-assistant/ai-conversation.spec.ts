import { describe, expect, it } from 'vitest';
import { getHumanSupportReply, getSocialReply, resolveServiceFollowUp } from './ai-conversation.js';

describe('customer conversation', () => {
  it.each(['t cần gặp nhân viên', 'cho gặp người thật', 'mình muốn nói chuyện với tư vấn viên', 'chuyển cho nhân viên giúp tôi', 'cần nhân viên hỗ trợ', 'liên hệ support', 'số điện thoại của shop', 'hotline', 'talk to a human'])('directs a human support request to real contact options: %s', (message) => {
    const reply = getHumanSupportReply(message);
    expect(reply).toContain('tel:0941900966');
    expect(reply).toContain('/lien-he');
    expect(reply).toContain('chưa có nhân viên tiếp nhận');
    expect(reply).not.toMatch(/đã chuyển|đã gửi|chọn hồ sơ|đăng nhập/);
  });

  it.each(['nhân viên có cân lại bé không?', 'nhân viên làm Spa bao lâu?', 'không cần gặp nhân viên, chỉ hỏi giá', 'muốn tắm cho mèo'])('keeps ordinary staff questions or a declined handoff out of the contact route: %s', (message) => {
    expect(getHumanSupportReply(message)).toBeNull();
  });
  it.each(['hello', 'Hello!', 'hi shop', 'xin chào', 'chào shop', 'alo', 'shop ơi', 'có ai không?', 'hello 👋'])('greets %s without treating it as an unknown business question', (message) => {
    const reply = getSocialReply(message);
    expect(reply).toContain('Chào bạn');
    expect(reply).not.toMatch(/chưa tìm|không hiểu|dữ liệu|API|RAG/);
  });

  it.each(['cảm ơn nhé', 'thanks', 'thank you', 'cám ơn shop'])('acknowledges %s briefly', (message) => {
    expect(getSocialReply(message)).toContain('Không có gì');
  });

  it.each(['tạm biệt', 'bye bye', 'bai'])('says goodbye for %s', (message) => {
    expect(getSocialReply(message)).toContain('Hẹn gặp');
  });

  it.each(['hello, Spa mèo 3kg bao nhiêu?', 'chào shop, bé bị sốt', 'cảm ơn, mai còn chỗ không?', 'hiện còn hàng không?', 'mua thức ăn', 'ok'])('keeps substantive or ambiguous messages for the assistant: %s', (message) => {
    expect(getSocialReply(message)).toBeNull();
  });

  it('uses customer-supplied service, species and weight across short replies', () => {
    const history = [{ role: 'user', content: 'Mình muốn tắm cho bé' }, { role: 'model', content: 'Bé là chó hay mèo?' }, { role: 'user', content: 'mèo' }];
    expect(resolveServiceFollowUp('3,2kg', history)).toBe('Mình muốn tắm Spa mèo 3,2 kg');
  });

  it('uses the newest weight and never imports facts from model replies', () => {
    expect(resolveServiceFollowUp('4kg', [{ role: 'user', content: 'Mình muốn tắm cho mèo 3kg' }, { role: 'model', content: 'Chó 8kg' }])).toBe('Mình muốn tắm Spa mèo 4 kg');
  });

  it('does not carry a service question across a product topic or unrelated question', () => {
    expect(resolveServiceFollowUp('3kg', [{ role: 'user', content: 'Muốn tắm cho mèo' }, { role: 'user', content: 'Mua thức ăn' }])).toBe('3kg');
    expect(resolveServiceFollowUp('Bé bị sốt', [{ role: 'user', content: 'Muốn tắm cho mèo' }])).toBe('Bé bị sốt');
  });
});
