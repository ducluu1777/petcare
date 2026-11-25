import { describe, expect, it, vi } from 'vitest';
import { AiAdminService } from './ai-admin.service.js';

describe('AiAdminService', () => {
  it('returns actual token usage reported by Gemini for today and recent requests', async () => {
    const prisma = {
      aiAssistantSettings: {
        upsert: vi.fn().mockResolvedValue({ id: 'singleton', dailyRequestLimit: 240 }),
      },
      aiChatUsage: {
        count: vi.fn().mockResolvedValue(3),
        aggregate: vi.fn().mockResolvedValue({
          _sum: { inputTokens: 512, outputTokens: 96, totalTokens: 608 },
        }),
        findMany: vi.fn().mockResolvedValue([{
          requestId: 'request-1',
          source: 'model',
          model: 'gemini-test',
          durationMs: 1200,
          inputTokens: 128,
          outputTokens: 24,
          totalTokens: 152,
          reason: null,
          status: null,
          createdAt: new Date('2026-10-22T04:00:00Z'),
        }]),
      },
      $queryRaw: vi.fn().mockResolvedValue([
        { date: '2026-10-21', source: 'model', modelRequest: true, requests: 2, providerErrors: 0 },
        { date: '2026-10-22', source: 'fallback', modelRequest: false, requests: 1, providerErrors: 0 },
        { date: '2026-10-22', source: 'fallback', modelRequest: true, requests: 1, providerErrors: 1 },
      ]),
    };
    const knowledge = { getStatus: vi.fn().mockReturnValue({ sources: 1, chunks: 2, indexedChunks: 2, model: 'embedding' }) };
    const service = new AiAdminService(prisma as never, knowledge as never);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T07:00:00.000Z'));
    let overview: Awaited<ReturnType<typeof service.getOverview>>;
    try {
      overview = await service.getOverview(7);
    } finally {
      vi.useRealTimers();
    }

    expect(overview.providerTokenUsageToday).toEqual({ inputTokens: 512, outputTokens: 96, totalTokens: 608 });
    expect(overview.recentRequests[0]).toMatchObject({ inputTokens: 128, outputTokens: 24, totalTokens: 152, status: null });
    expect(overview.dailyUsage).toHaveLength(7);
    expect(overview.dailyUsage.at(-2)).toMatchObject({ date: '2026-10-21', totalRequests: 2, modelRequests: 2, fallbackResponses: 0, providerErrors: 0 });
    expect(overview.dailyUsage.at(-1)).toMatchObject({ date: '2026-10-22', totalRequests: 2, modelRequests: 1, fallbackResponses: 2, providerErrors: 1 });
    expect(prisma.aiChatUsage.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
    }));
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('only accepts 7-day or 30-day usage windows', async () => {
    const service = new AiAdminService({} as never, {} as never);

    await expect(service.getOverview(14)).rejects.toThrow('Chỉ hỗ trợ xem mức sử dụng 7 hoặc 30 ngày.');
  });

  it('persists an internal daily model-request limit', async () => {
    const prisma = {
      aiAssistantSettings: {
        upsert: vi.fn().mockResolvedValue({ id: 'singleton', dailyRequestLimit: 240 }),
      },
    };
    const service = new AiAdminService(prisma as never, {} as never);

    await expect(service.updateSettings(240)).resolves.toEqual({
      dailyRequestLimit: 240,
    });
    expect(prisma.aiAssistantSettings.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'singleton' },
      create: { id: 'singleton', dailyRequestLimit: 240 },
      update: { dailyRequestLimit: 240 },
    }));
  });

  it('rejects limits outside the supported range', async () => {
    const service = new AiAdminService({} as never, {} as never);

    await expect(service.updateSettings(0)).rejects.toThrow();
    await expect(service.updateSettings(100_001)).rejects.toThrow();
  });

  it('refreshes the live knowledge index after saving an entry', async () => {
    const entry = {
      id: 'faq-1',
      title: 'Thời gian hoạt động',
      answer: 'PetCare mở cửa hằng ngày.',
      content: 'Thông tin chi tiết về giờ mở cửa.',
      source: 'Quản trị viên',
      reviewedAt: '2026-10-22',
      enabled: true,
    };
    const prisma = { aiKnowledgeEntry: { create: vi.fn().mockResolvedValue(entry) } };
    const knowledge = { refreshKnowledgeBase: vi.fn().mockResolvedValue(undefined) };
    const service = new AiAdminService(prisma as never, knowledge as never);

    await expect(service.createKnowledgeEntry(entry)).resolves.toEqual(entry);
    expect(knowledge.refreshKnowledgeBase).toHaveBeenCalledOnce();
  });
});
