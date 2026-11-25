import { describe, expect, it } from 'vitest';
import { parseKnowledgeMarkdown, rankLexicalKnowledge } from './ai-knowledge.documents.js';

describe('approved customer documents', () => {
  it('extracts a concise answer separately from the detailed knowledge text', () => {
    const chunks = parseKnowledgeMarkdown('booking.md', '# Đặt lịch\n<!-- reviewed: 2026-10-21 -->\n\n## Đặt tại quầy\n### Trả lời nhanh\nPetCare chưa hỗ trợ đặt lịch Spa cho khách chưa có tài khoản.\n\n### Chi tiết\nKhách cần có tài khoản đang hoạt động.');

    expect(chunks[0]).toMatchObject({
      answer: 'PetCare chưa hỗ trợ đặt lịch Spa cho khách chưa có tài khoản.',
      content: 'Khách cần có tài khoản đang hoạt động.',
    });
  });

  it('keeps section provenance and excludes document metadata from customer text', () => {
    const chunks = parseKnowledgeMarkdown('booking.md', '# Đặt lịch\n<!-- reviewed: 2026-10-21 -->\n\n## Đổi lịch\nKhách đổi trước giờ hẹn ít nhất 4 tiếng.\n\n## Tiếp nhận\nChọn hồ sơ thú cưng của bạn.');
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ title: 'Đặt lịch — Đổi lịch', source: 'booking.md', reviewedAt: '2026-10-21' });
    expect(chunks[0].content).not.toContain('reviewed:');
    expect(chunks[1].id).not.toBe(chunks[0].id);
  });

  it('bounds long sections while retaining all content and stable identifiers', () => {
    const markdown = '# Chăm sóc\n<!-- reviewed: 2026-10-21 -->\n\n## Lưu ý\n' + 'Một lưu ý về thú cưng. '.repeat(200);
    const chunks = parseKnowledgeMarkdown('care.md', markdown);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.content.length <= 1600)).toBe(true);
    expect(chunks.at(-1)?.content).toContain('thú cưng.');
    expect(parseKnowledgeMarkdown('care.md', markdown).map(chunk => chunk.id)).toEqual(chunks.map(chunk => chunk.id));
  });

  it('finds Vietnamese policy text without accents and avoids unrelated answers', () => {
    const chunks = parseKnowledgeMarkdown('guide.md', '# PetCare\n<!-- reviewed: 2026-10-21 -->\n\n## Đón thú cưng\nNhân viên báo khi bé sẵn sàng nhận.\n\n## Chuẩn bị trước buổi hẹn\nGhi rõ tiền sử dị ứng và điều bé sợ.');
    expect(rankLexicalKnowledge('chuan bi truoc buoi hen', chunks, 1)[0]?.title).toContain('Chuẩn bị');
    expect(rankLexicalKnowledge('bitcoin ethereum', chunks)).toEqual([]);
    expect(rankLexicalKnowledge('', chunks)).toEqual([]);
  });

  it('keeps concise answers on every chunk when long policy sections are split', () => {
    const markdown = '# Chăm sóc\n<!-- reviewed: 2026-10-21 -->\n\n## Lưu ý\n### Trả lời nhanh\nHãy trao đổi các lưu ý với nhân viên.\n\n### Chi tiết\n' + 'Một lưu ý về thú cưng. '.repeat(200);
    const chunks = parseKnowledgeMarkdown('care.md', markdown);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.answer === 'Hãy trao đổi các lưu ý với nhân viên.')).toBe(true);
  });
});
