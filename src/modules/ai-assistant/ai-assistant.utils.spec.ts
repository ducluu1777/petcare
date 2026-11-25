import { describe, expect, it } from 'vitest';
import {
  cosineSimilarity,
  rankKnowledgeDocuments,
  stripAssistantEmoji,
} from './ai-assistant.utils.js';

describe('ai-assistant utilities', () => {
  it('removes emoji while preserving Vietnamese text and numeric values', () => {
    expect(stripAssistantEmoji('Mèo 🐱 giảm 👉 10.000đ nhé.')).toBe('Mèo giảm 10.000đ nhé.');
  });

  it('returns zero similarity for empty or mismatched vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 0], [1])).toBe(0);
  });

  it('ranks relevant knowledge documents and excludes results below the threshold', () => {
    const documents = [
      { id: 'service-price', title: 'Giá dịch vụ', content: 'Giá Spa theo cân nặng.', embedding: [1, 0] },
      { id: 'support-hours', title: 'Giờ hỗ trợ', content: 'Cửa hàng mở đến 20:30.', embedding: [0.8, 0.2] },
      { id: 'dịch vụ không hỗ trợ', title: 'Pet dịch vụ không hỗ trợ', content: 'Nội dung giai đoạn sau.', embedding: [0, 1] },
    ];

    const results = rankKnowledgeDocuments([1, 0], documents, 2, 0.5);

    expect(results.map((document) => document.id)).toEqual(['service-price', 'support-hours']);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
