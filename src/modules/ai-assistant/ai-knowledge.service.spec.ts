import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AiKnowledgeService } from './ai-knowledge.service.js';
import { PETCARE_KNOWLEDGE_BASE } from './ai-knowledge.base.js';

const { embedContent, genAIOptions } = vi.hoisted(() => ({ embedContent: vi.fn(), genAIOptions: vi.fn() }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(options: unknown) { genAIOptions(options); }
    models = { embedContent };
  },
}));

describe('AiKnowledgeService', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'petcare-semantic-test-'));
    genAIOptions.mockClear();
    embedContent.mockReset();
    embedContent.mockImplementation(({ contents }: { contents: string | string[] }) => {
      if (Array.isArray(contents)) {
        return Promise.resolve({
          embeddings: contents.map((_, index) => ({ values: Array.from({ length: 768 }, (_, dimension) => dimension === (index === 0 ? 0 : 1) ? 1 : 0) })),
        });
      }
      return Promise.resolve({ embeddings: [{ values: Array.from({ length: 768 }, (_, dimension) => dimension === 0 ? 1 : 0) }] });
    });
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it('bounds embedding requests so unavailable retrieval cannot stall the website', () => {
    new AiKnowledgeService({ get: () => 'test-key' } as any);
    expect(genAIOptions).toHaveBeenCalledWith(expect.objectContaining({
      httpOptions: { timeout: 10_000, retryOptions: { attempts: 1 } },
    }));
  });

  it('includes approved booking, pickup, payment, and voucher rules in the retrieval corpus', () => {
    const corpus = PETCARE_KNOWLEDGE_BASE.map((document) => document.content).join('\n').toLowerCase();

    expect(corpus).toContain('tối đa 3 lịch');
    expect(corpus).toContain('trước giờ hẹn ít nhất 4 tiếng');
    expect(corpus).toContain('sau giờ spa đóng cửa 18:30');
    expect(corpus).toContain('nhân viên kiểm tra giao dịch trên sepay');
    expect(corpus).toContain('mỗi hóa đơn chỉ dùng một ưu đãi');
    expect(corpus).toContain('không hiển thị thời lượng hoặc giờ kết thúc dự kiến');
    expect(corpus).not.toContain('thời lượng chăm sóc chỉ để tham khảo');
  });

  it('provides a short customer-ready answer for every knowledge section', () => {
    expect(PETCARE_KNOWLEDGE_BASE.every(document => !!document.answer?.trim())).toBe(true);
  });

  it('uses the persisted knowledge entries after an administrator refreshes them', async () => {
    const prisma = {
      aiKnowledgeEntry: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([{
          id: 'custom-entry',
          title: 'Giờ mở cửa PetCare',
          answer: 'PetCare mở cửa mỗi ngày.',
          content: 'Thông tin giờ mở cửa được cập nhật từ trang quản trị.',
          source: 'Quản trị viên',
          reviewedAt: '2026-10-22',
        }]),
      },
    };
    const service = new AiKnowledgeService({ get: () => undefined } as any, prisma as any);

    await service.refreshKnowledgeBase();

    expect(service.getLexicalAnswer('Giờ mở cửa PetCare')).toBe('PetCare mở cửa mỗi ngày.');
  });

  it('answers a walk-in booking question without returning the whole booking-policy paragraph', () => {
    const service = new AiKnowledgeService({ get: () => undefined } as any);
    const answer = service.getLexicalAnswer('Khách vãng lai có đặt lịch Spa tại quầy được không?');

    expect(answer).toBe('Hiện PetCare chưa hỗ trợ đặt lịch Spa cho khách chưa có tài khoản.');
    expect(answer).not.toContain('chọn dịch vụ');
    expect(answer).not.toContain('cân nặng ước tính');
  });

  it('does not return a weakly matched knowledge answer', () => {
    const service = new AiKnowledgeService({ get: () => undefined } as any);

    expect(service.getLexicalAnswer('email mục avocado mango kiwi lemon')).toBe('');
  });

  it('logs retrieval ids and relevance scores without logging customer query text', async () => {
    const service = new AiKnowledgeService({ get: () => undefined } as any);
    const log = vi.spyOn((service as any).logger, 'log');

    await service.getRelevantContext('Khách đặt lịch tại quầy thế nào?');

    const retrievalLog = log.mock.calls
      .map(([line]) => String(line))
      .find(line => line.includes('"event":"ai_knowledge_retrieval"'));
    expect(retrievalLog).toContain('"strategy":"lexical"');
    expect(retrievalLog).toContain('"id":"02-dat-lich.md:2:0"');
    expect(retrievalLog).toContain('"score":');
    expect(retrievalLog).not.toContain('Khách đặt lịch');
  });

  it('builds a semantic index and returns only relevant approved facts', async () => {
    const service = new AiKnowledgeService({
      get: (name: string) => name === 'GEMINI_API_KEY' ? 'test-key' : name === 'AI_KNOWLEDGE_INDEX_PATH' ? join(directory, 'index.json') : undefined,
    } as any);

    await service.onModuleInit();
    const context = await service.getRelevantContext('PetCare hiện có những dịch vụ nào?');

    expect(embedContent).toHaveBeenCalledTimes(2);
    expect(embedContent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      model: 'gemini-embedding-001',
      config: expect.objectContaining({ taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 768 }),
    }));
    expect(context).toContain('Phạm vi dịch vụ hiện tại');
    expect(context).not.toContain('Cân nặng và giá');
  });

  it('stays available without an API key and does not call the embedding API', async () => {
    const service = new AiKnowledgeService({ get: () => undefined } as any);

    await service.onModuleInit();
    await expect(service.getRelevantContext('Giờ Spa')).resolves.toContain('Giờ Spa');

    expect(embedContent).not.toHaveBeenCalled();
  });
});
