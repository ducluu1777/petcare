import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiAssistantService } from './ai-assistant.service.js';
import { ServicesService } from '../services/services.service.js';
import { ProductsService } from '../products/products.service.js';
import { TimeSlotsService } from '../time-slots/time-slots.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { PetsService } from '../pets/pets.service.js';
import { vi } from 'vitest';
import { Role } from '@prisma/client';
import { AiKnowledgeService } from './ai-knowledge.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockGenAIOptions = vi.hoisted(() => vi.fn());

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(options: unknown) { mockGenAIOptions(options); }
    models = { generateContent: mockGenerateContent };
  },
  FunctionCallingConfigMode: { NONE: 'NONE' },
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
  },
}));

describe('AiAssistantService', () => {
  let service: AiAssistantService;
  let mockServicesService: any;
  let mockProductsService: any;
  let mockTimeSlotsService: any;
  let mockBookingsService: any;
  let mockPetsService: any;
  let mockKnowledgeService: any;
  let mockPrisma: any;
  let mockAiChatRequests: Map<string, any>;

  beforeEach(async () => {
    mockGenAIOptions.mockClear();
    mockGenerateContent.mockReset().mockResolvedValue({
      functionCalls: undefined,
      text: 'Mock response text',
    });
    mockServicesService = {
      findAll: vi.fn().mockResolvedValue([]),
      calculatePrice: vi.fn().mockResolvedValue({ priceApplied: 200000 }),
    };
    mockProductsService = {
      recommend: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
    };
    mockTimeSlotsService = {
      findAvailableByDate: vi.fn().mockResolvedValue([]),
      findExistingAvailableByDate: vi.fn().mockResolvedValue({ configured: false, slots: [] }),
    };
    mockBookingsService = {
      getAvailableSlots: vi.fn().mockResolvedValue({ date: '2026-10-25', slots: [] }),
      getAdminScheduleSettings: vi.fn().mockResolvedValue({ openHours: { '1': { open: '08:30', close: '18:30' } }, holidays: [], capacity: 3, slotStepMin: 30, minNoticeHours: 2, maxAdvanceDays: 30, cancelBeforeHours: 4, latePickupFeeAmount: 50000, spaBookingPromotionActive: true }),
    };
    mockPetsService = {
      findAllByUser: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue({ id: 'pet-1', userId: 'user-1' }),
    };
    mockKnowledgeService = { getRelevantContext: vi.fn().mockResolvedValue(''), getLexicalAnswer: vi.fn().mockReturnValue('') };
    mockAiChatRequests = new Map();
    mockPrisma = {
      aiAssistantSettings: {
        upsert: vi.fn().mockResolvedValue({ dailyRequestLimit: 1000 }),
      },
      aiChatUsage: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({}),
      },
      aiChatRequest: {
        create: vi.fn(async ({ data }: any) => {
          if (mockAiChatRequests.has(data.idempotencyKey)) {
            throw Object.assign(new Error('unique key conflict'), { code: 'P2002' });
          }
          const row = { ...data };
          mockAiChatRequests.set(data.idempotencyKey, row);
          return row;
        }),
        findUnique: vi.fn(async ({ where }: any) => mockAiChatRequests.get(where.idempotencyKey) ?? null),
        update: vi.fn(async ({ where, data }: any) => {
          const row = mockAiChatRequests.get(where.idempotencyKey);
          if (!row) throw new Error('request not found');
          Object.assign(row, data);
          return row;
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          const row = mockAiChatRequests.get(where.idempotencyKey);
          if (!row || row.status !== where.status) return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        }),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAssistantService,
        { provide: ConfigService, useValue: { get: vi.fn().mockReturnValue('fake-key') } },
        { provide: ServicesService, useValue: mockServicesService },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: TimeSlotsService, useValue: mockTimeSlotsService },
        { provide: BookingsService, useValue: mockBookingsService },
        { provide: PetsService, useValue: mockPetsService },
        { provide: AiKnowledgeService, useValue: mockKnowledgeService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AiAssistantService>(AiAssistantService);
  });

  it('bounds Gemini requests without retrying while customers wait', () => {
    expect(mockGenAIOptions).toHaveBeenCalledWith(expect.objectContaining({
      httpOptions: { timeout: 15_000, retryOptions: { attempts: 1 } },
    }));
  });

  it('replays a completed AI request without calling Gemini or recording usage twice', async () => {
    const requestId = '4d49c050-b62f-4f3e-9544-a6905f016281';
    mockGenerateContent.mockResolvedValue({ text: 'Mình nghe đây.' });

    const first = await (service.chat as any)('hello', [], undefined, requestId);
    const replay = await (service.chat as any)('hello', [], undefined, requestId);

    expect(replay).toEqual(first);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockPrisma.aiChatUsage.create).toHaveBeenCalledTimes(1);
  });

  it('rejects reusing an AI request id with different conversation content', async () => {
    const requestId = '5d49c050-b62f-4f3e-9544-a6905f016282';
    mockGenerateContent.mockResolvedValue({ text: 'Mình nghe đây.' });
    await (service.chat as any)('hello', [], undefined, requestId);

    await expect((service.chat as any)('Giá Spa bao nhiêu?', [], undefined, requestId))
      .rejects.toThrow('đã được dùng cho nội dung khác');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('does not start a second model call while the same AI request is processing', async () => {
    const requestId = '6d49c050-b62f-4f3e-9544-a6905f016283';
    let resolveModel!: (value: any) => void;
    mockGenerateContent.mockImplementation(() => new Promise((resolve) => { resolveModel = resolve; }));

    const firstRequest = (service.chat as any)('hello', [], undefined, requestId);
    await vi.waitFor(() => expect(mockGenerateContent).toHaveBeenCalledTimes(1));

    await expect((service.chat as any)('hello', [], undefined, requestId))
      .rejects.toThrow('đang được xử lý');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    resolveModel({ text: 'Mình nghe đây.' });
    const completed = await firstRequest;
    const replay = await (service.chat as any)('hello', [], undefined, requestId);
    expect(replay).toEqual(completed);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('replays a completed AI stream without regenerating or recording usage twice', async () => {
    const requestId = '7d49c050-b62f-4f3e-9544-a6905f016284';
    const firstChunks: string[] = [];
    const replayChunks: string[] = [];
    let firstMetadata: unknown;
    let replayMetadata: unknown;

    await service.chatStream('hello', [], 'user-1', (chunk) => firstChunks.push(chunk), (metadata) => { firstMetadata = metadata; }, requestId);
    await service.chatStream('hello', [], 'user-1', (chunk) => replayChunks.push(chunk), (metadata) => { replayMetadata = metadata; }, requestId);

    expect(replayChunks).toEqual(firstChunks);
    expect(replayMetadata).toEqual(firstMetadata);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockPrisma.aiChatUsage.create).toHaveBeenCalledTimes(1);
  });

  it('does not run a concurrent duplicate AI stream and replays it after the first completes', async () => {
    const requestId = '8d49c050-b62f-4f3e-9544-a6905f016285';
    let resolveModel!: (value: any) => void;
    mockGenerateContent.mockImplementation(() => new Promise((resolve) => { resolveModel = resolve; }));
    const firstChunks: string[] = [];
    const firstStream = service.chatStream('hello', [], 'user-1', (chunk) => firstChunks.push(chunk), undefined, requestId);

    await vi.waitFor(() => expect(mockGenerateContent).toHaveBeenCalledTimes(1));
    await expect(service.chatStream('hello', [], 'user-1', () => undefined, undefined, requestId))
      .rejects.toThrow('đang được xử lý');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockPrisma.aiChatUsage.create).not.toHaveBeenCalled();

    resolveModel({ text: 'Mình nghe đây.' });
    await firstStream;

    const replayChunks: string[] = [];
    await service.chatStream('hello', [], 'user-1', (chunk) => replayChunks.push(chunk), undefined, requestId);
    expect(replayChunks).toEqual(firstChunks);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockPrisma.aiChatUsage.create).toHaveBeenCalledTimes(1);
  });

  it.each(['hello', 't có mèo 5kg', 't cần gặp nhân viên', 'mèo bị viêm tai thì làm sao'])('lets the model answer %s with conversation history', async (message) => {
    const history = [{ role: 'user' as const, content: 'Mình muốn hỏi về bé mèo' }];
    mockGenerateContent.mockResolvedValue({ text: 'Câu trả lời theo ngữ cảnh từ model' });
    const result = await service.chat(message, history);
    expect(result).toMatchObject({ text: 'Câu trả lời theo ngữ cảnh từ model', source: 'model' });
    expect(mockGenerateContent.mock.calls[0][0].contents[0]).toEqual({ role: 'user', parts: [{ text: history[0].content }] });
    expect(mockKnowledgeService.getLexicalAnswer).not.toHaveBeenCalled();
  });

  it('records token usage returned by Gemini without estimating missing values', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Câu trả lời có số liệu usage.',
      usageMetadata: {
        promptTokenCount: 412,
        candidatesTokenCount: 37,
        totalTokenCount: 449,
      },
    });

    const reply = await service.chat('Giờ mở cửa thế nào?', []);

    expect(reply).not.toHaveProperty('usageMetadata');
    expect(mockPrisma.aiChatUsage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        modelRequest: true,
        inputTokens: 412,
        outputTokens: 37,
        totalTokens: 449,
      }),
    }));
  });

  it('continues using the model when document retrieval fails', async () => {
    mockKnowledgeService.getRelevantContext.mockRejectedValue(new Error('retrieval unavailable'));
    const result = await service.chat('t có mèo 5kg', []);
    expect(result).toMatchObject({ text: 'Mock response text', source: 'model' });
    expect(mockKnowledgeService.getLexicalAnswer).not.toHaveBeenCalled();
  });

  it('uses the fallback instead of calling Gemini after the daily model limit is reached', async () => {
    mockPrisma.aiAssistantSettings.upsert.mockResolvedValue({ dailyRequestLimit: 1 });
    mockPrisma.aiChatUsage.count.mockResolvedValue(1);

    const result = await service.chat('PetCare mở cửa lúc nào?', []);

    expect(result.source).toBe('fallback');
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(mockKnowledgeService.getRelevantContext).not.toHaveBeenCalled();
    expect(mockPrisma.aiChatUsage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ source: 'fallback', reason: 'daily_request_limit' }),
    }));
  });

  it('marks the response as fallback only after a provider error', async () => {
    mockGenerateContent.mockRejectedValue(Object.assign(new Error('quota'), { status: 429 }));
    expect(await service.chat('hello', [])).toMatchObject({ source: 'fallback' });
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('logs a sanitized provider message with the AI request id', async () => {
    const apiKey = 'test-api-key';
    mockGenerateContent.mockRejectedValue(Object.assign(new Error(JSON.stringify({
      error: { code: 503, status: 'UNAVAILABLE', message: `Model overloaded; key=${apiKey}` },
    })), { status: 503, name: 'ApiError' }));
    const warn = vi.spyOn((service as any).logger, 'warn');

    await service.chat('hello', []);

    const fallbackEvent = warn.mock.calls
      .map(([line]) => String(line))
      .find(line => line.includes('"event":"ai_reply"'));
    const logged = JSON.parse(fallbackEvent!);
    expect(logged).toMatchObject({
      providerName: 'ApiError',
      providerStatus: 'UNAVAILABLE',
      providerMessage: 'Model overloaded; key=[REDACTED]',
    });
    expect(logged.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(fallbackEvent).not.toContain(apiKey);
  });

  it('correlates fallback reason with knowledge retrieval using a request id', async () => {
    mockGenerateContent.mockRejectedValue(Object.assign(new Error('quota'), { status: 429 }));
    mockKnowledgeService.getLexicalAnswer.mockReturnValue('Bạn nên ghi chú điều bé sợ.');
    const warn = vi.spyOn((service as any).logger, 'warn');

    const result = await service.chat('Cần chuẩn bị gì trước buổi hẹn Spa?', []);

    expect(result.source).toBe('fallback');
    const fallbackEvent = warn.mock.calls
      .map(([line]) => String(line))
      .find(line => line.includes('"event":"ai_reply"'));
    const requestId = JSON.parse(fallbackEvent!).requestId;
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(mockKnowledgeService.getRelevantContext).toHaveBeenCalledWith(
      'Cần chuẩn bị gì trước buổi hẹn Spa?',
      requestId,
    );
    expect(mockKnowledgeService.getLexicalAnswer).toHaveBeenCalledWith(
      'Cần chuẩn bị gì trước buổi hẹn Spa?',
      requestId,
    );
  });

  it('opens booking choices only when requested by the model, preserving its answer', async () => {
    mockGenerateContent.mockResolvedValueOnce({ functionCalls: [{ name: 'showChoices', args: { kind: 'booking', species: 'CAT', weightKg: 5 } }] })
      .mockResolvedValueOnce({ text: 'Bạn chọn ngày và giờ thuận tiện cho bé bên dưới nhé.' });
    expect(await service.chat('đặt lịch cho bé nhé', [{ role: 'user', content: 't có mèo 5kg' }])).toMatchObject({
      source: 'model', text: 'Bạn chọn ngày và giờ thuận tiện cho bé bên dưới nhé.', workflow: { kind: 'booking', species: 'CAT', weightKg: 5 },
    });
  });

  it('answers preparation questions from approved documents when Gemini is unavailable', async () => {
    mockGenerateContent.mockRejectedValue(new Error('provider unavailable'));
    mockKnowledgeService.getLexicalAnswer.mockReturnValue('Bạn hãy ghi rõ tiền sử dị ứng và điều bé sợ trước buổi hẹn.');
    const result = await service.chat('Cần chuẩn bị gì trước buổi hẹn Spa?', []);
    expect(result.text).toContain('tiền sử dị ứng');
    expect(mockServicesService.findAll).not.toHaveBeenCalled();
  });

  it('reads public operating rules from current settings without exposing unrelated fields', async () => {
    mockBookingsService.getAdminScheduleSettings.mockResolvedValue({ capacity: 5, slotStepMin: 30, latePickupFeeAmount: 70000, spaBookingPromotionActive: false, internalNote: 'private' });
    const result = await (service as any).dispatchFunction('getStoreInformation', {});
    expect(result).toMatchObject({ capacityPerStartSlot: 5, latePickupFeeAmount: 70000, spaPromotionActive: false });
    expect(result).not.toHaveProperty('internalNote');
  });

  it('should format deep link for spa', () => {
    const args = { type: 'spa', serviceId: 's1', petId: 'p1' };
    const res = (service as any).formatDeepLink(args);
    expect(res).toBe('/dat-lich?service=s1');
  });

  it('should format deep link for product', () => {
    const args = { type: 'product', productSlug: 'food' };
    const res = (service as any).formatDeepLink(args);
    expect(res).toBe('/cua-hang/food');
  });

  it('should format deep link for loyalty', () => {
    const args = { type: 'loyalty' };
    const res = (service as any).formatDeepLink(args);
    expect(res).toBe('/tai-khoan');
  });

  it('should dispatch function getServices correctly', async () => {
    const res = await (service as any).dispatchFunction('getServices', { category: 'BATH' });
    expect(mockServicesService.findAll).toHaveBeenCalledWith('BATH', undefined);
    expect(res).toEqual([]);
  });

  it('calculates a pet price only after checking that the pet belongs to the signed-in customer', async () => {
    await (service as any).dispatchFunction('calculateServicePrice', { serviceId: 'srv-1', petId: 'pet-1' }, 'user-1');
    expect(mockPetsService.findById).toHaveBeenCalledWith('pet-1', 'user-1', Role.CUSTOMER);
    expect(mockServicesService.calculatePrice).toHaveBeenCalledWith('srv-1', 'pet-1');
  });

  it('does not read or calculate a pet price when the visitor is not signed in', async () => {
    const result = await (service as any).dispatchFunction('calculateServicePrice', { serviceId: 'srv-1', petId: 'pet-1' });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockPetsService.findById).not.toHaveBeenCalled();
    expect(mockServicesService.calculatePrice).not.toHaveBeenCalled();
  });

  it('supports public price estimates from species and weight', async () => {
    await (service as any).dispatchFunction('calculateServicePrice', { serviceId: 'srv-1', weightKg: 4.9, species: 'DOG' });
    expect(mockServicesService.calculatePrice).toHaveBeenCalledWith('srv-1', undefined, 4.9, 'DOG');
  });

  it('rejects unknown availability tools', async () => {
    const result = await (service as any).dispatchFunction('checkUnknownAvailability', { startDate: '2026-10-20', endDate: '2026-10-21' });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockTimeSlotsService.findAvailableByDate).not.toHaveBeenCalled();
  });

  it('uses the read-only availability lookup for AI', async () => {
    await (service as any).dispatchFunction('checkSpaAvailability', { date: '2026-10-20' });
    expect(mockBookingsService.getAvailableSlots).toHaveBeenCalledWith({ date: '2026-10-20', serviceIds: [] });
    expect(mockTimeSlotsService.findExistingAvailableByDate).not.toHaveBeenCalled();
    expect(mockTimeSlotsService.findAvailableByDate).not.toHaveBeenCalled();
  });

  it('uses Booking V2 capacity and excludes blocked or full start slots', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-24T04:00:00.000Z'));
    mockBookingsService.getAvailableSlots.mockResolvedValue({
      date: '2026-10-25',
      slots: [
        { time: '09:00', available: true, remaining: 2 },
        { time: '09:30', available: false, remaining: 0 },
        { time: '14:00', available: false, remaining: 0, unavailableReason: 'SHIFT_HANDOVER' },
      ],
    });

    try {
      const result = await (service as any).generateFallbackResponse('Ngày 25/10/2026 còn khung giờ Spa nào trống?');

      expect(result).toContain('09:00');
      expect(result).toContain('còn 2 chỗ');
      expect(result).not.toContain('09:30');
      expect(result).not.toContain('14:00');
      expect(mockTimeSlotsService.findExistingAvailableByDate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives Gemini only currently bookable V2 start slots', async () => {
    mockBookingsService.getAvailableSlots.mockResolvedValue({
      date: '2026-10-25',
      slots: [
        { time: '09:00', available: true, remaining: 2 },
        { time: '14:00', available: false, remaining: 0, unavailableReason: 'SHIFT_HANDOVER' },
      ],
    });

    const result = await (service as any).dispatchFunction('checkSpaAvailability', { date: '2026-10-25' });

    expect(result).toEqual({ date: '2026-10-25', slots: [{ time: '09:00', available: true, remaining: 2 }] });
    expect(mockTimeSlotsService.findExistingAvailableByDate).not.toHaveBeenCalled();
  });

  it('looks up tomorrow when the visitor asks about tomorrow', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T04:00:00.000Z'));
    try {
      const result = await (service as any).generateFallbackResponse('Ngày mai còn giờ trống không?');
      expect(result).toContain('2026-10-17');
      expect(mockBookingsService.getAvailableSlots).toHaveBeenCalledWith({ date: '2026-10-17', serviceIds: [] });
    } finally {
      vi.useRealTimers();
    }
  });

  it('prioritizes availability when the question also mentions Spa', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T04:00:00.000Z'));
    mockBookingsService.getAvailableSlots.mockResolvedValue({
      date: '2026-10-20',
      slots: [{ time: '09:00', available: true, remaining: 3 }],
    });

    try {
      const result = await (service as any).generateFallbackResponse('Hôm nay PetCare còn khung giờ Spa nào trống?');

      expect(result).toContain('Các khung giờ còn chỗ ngày 2026-10-20');
      expect(result).toContain('09:00');
      expect(result).toContain('còn 3 chỗ');
      expect(mockServicesService.findAll).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a dated price question on the pricing path', async () => {
    mockServicesService.findAll.mockResolvedValue([{
      name: 'Tắm Spa và dưỡng lông',
      category: 'BATH',
      isAddon: false,
      priceTiers: [
        { species: 'DOG', minWeight: 0, maxWeight: 5, price: 180000 },
        { species: 'DOG', minWeight: 5, maxWeight: 20, price: 350000 },
      ],
    }]);

    const result = await (service as any).generateFallbackResponse('Ngày mai Spa chó 4 kg giá bao nhiêu?');

    expect(result).toContain('180.000đ');
    expect(mockBookingsService.getAvailableSlots).not.toHaveBeenCalled();
  });

  it.each(['25/10/2026', '2026-10-25', '25/10'])(
    'checks the requested date %s instead of today', async (date) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-21T04:00:00.000Z'));
      mockBookingsService.getAvailableSlots.mockImplementation(async ({ date: requestedDate }: { date: string }) => ({
        date: requestedDate,
        slots: requestedDate === '2026-10-25'
          ? [{ time: '10:30', available: true, remaining: 1 }]
          : [],
      }));

      try {
        const result = await (service as any).generateFallbackResponse(`Ngày ${date} còn khung giờ Spa nào trống?`);

        expect(result).toContain('2026-10-25');
        expect(result).toContain('10:30');
        expect(result).toContain('còn 1 chỗ');
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it.each(['31/02/2026', 'cuối tuần', 'thứ bảy'])(
    'asks for a valid specific date for %s instead of silently checking today', async (date) => {
      const result = await (service as any).generateFallbackResponse(`${date} còn khung giờ Spa nào trống?`);

      expect(result).toContain('DD/MM/YYYY');
      expect(mockBookingsService.getAvailableSlots).not.toHaveBeenCalled();
    },
  );

  it('resolves the day after tomorrow from the Vietnam date at midnight', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T17:30:00.000Z'));
    try {
      const result = await (service as any).generateFallbackResponse('Ngày kia còn giờ trống không?');
      expect(result).toContain('2026-10-24');
    } finally {
      vi.useRealTimers();
    }
  });

  it('should return error for unknown function', async () => {
    const res = await (service as any).dispatchFunction('unknown', {});
    expect(res).toEqual({ error: 'Unknown function: unknown' });
  });

  it('should chat successfully without function calls', async () => {
    const res = await service.chat('Mình muốn hỏi cách đặt lịch', []);
    expect(res).toEqual({ text: 'Mock response text', source: 'model' });
  });

  it('uses the greeting fallback only after Gemini fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('provider unavailable'));
    const result = await service.chat('hello', []);
    expect(result.text).toContain('Chào bạn');
    expect(mockGenerateContent).toHaveBeenCalled();
    expect(result.source).toBe('fallback');
  });

  it('prioritizes a request for a human instead of retrieving unrelated booking instructions', async () => {
    mockGenerateContent.mockRejectedValue(new Error('provider unavailable'));
    mockKnowledgeService.getLexicalAnswer.mockReturnValue('Khách đăng nhập, chọn hồ sơ thú cưng.');
    const result = await service.chat('t cần gặp nhân viên', []);
    expect(result.text).toContain('tel:0941900966');
    expect(result.text).not.toContain('chọn hồ sơ');
    expect(mockGenerateContent).toHaveBeenCalled();
    expect(result.source).toBe('fallback');
    expect(mockKnowledgeService.getLexicalAnswer).not.toHaveBeenCalled();
  });

  it('offers contact details in offline fallback without claiming a live transfer', async () => {
    const result = await (service as any).generateFallbackResponse('Tôi muốn nói chuyện với người thật');
    expect(result).toContain('/lien-he');
    expect(result).toContain('chưa có nhân viên tiếp nhận');
    expect(mockKnowledgeService.getLexicalAnswer).not.toHaveBeenCalled();
  });

  it('also recognizes greetings in the offline fallback', async () => {
    const result = await (service as any).generateFallbackResponse('shop ơi');
    expect(result).toContain('Chào bạn');
    expect(result).not.toContain('chưa tìm');
  });

  it('asks the species before quoting a bath price when the customer only asks to bathe their pet', async () => {
    (service as any).genAI = null;
    const result = await service.chat('Mình muốn tắm cho bé', []);
    expect(result.text).toBe('Bé nhà bạn là chó hay mèo?');
    expect(mockServicesService.findAll).not.toHaveBeenCalled();
  });

  it('uses previous customer context for a short species/weight reply when the model fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('provider unavailable'));
    mockServicesService.findAll.mockResolvedValue([{ name: 'Spa Mèo', category: 'CAT_SPA', isAddon: false, priceTiers: [{ minWeight: 0, maxWeight: 5, price: 220000, species: 'CAT' }] }]);
    const result = await service.chat('Mèo 3,2kg', [{ role: 'user', content: 'Mình muốn tắm cho bé' }, { role: 'model', content: 'Bé là chó hay mèo?' }]);
    expect(result.text).toContain('220.000');
    expect(result.text).toContain('mèo 3,2 kg');
    expect(result.text).not.toContain('Bạn kể thêm');
  });

  it('uses known pet details for a complete service question when the model fails', async () => {
    mockGenerateContent.mockRejectedValue(Object.assign(new Error('provider unavailable'), { status: 503 }));
    mockServicesService.findAll.mockResolvedValue([{ name: 'Spa Mèo', category: 'CAT_SPA', isAddon: false, priceTiers: [{ minWeight: 0, maxWeight: 5, price: 220000, species: 'CAT' }, { minWeight: 5, maxWeight: 20, price: 300000, species: 'CAT' }] }]);

    const result = await service.chat('Muốn tắm cho bé, giá bao nhiêu?', [{ role: 'user', content: 'T có mèo 5kg' }]);

    expect(result).toMatchObject({ source: 'fallback' });
    expect(result.text).toContain('300.000');
    expect(result.text).toContain('mèo 5 kg');
    expect(result.text).not.toContain('chó hay mèo');
  });

  it('asks a natural clarifying question when offline and the message is unclear', async () => {
    const result = await (service as any).generateFallbackResponse('xyz');
    expect(result).toContain('Mình chưa chắc thông tin này.');
    expect(result).toContain('/lien-he');
  });

  it('guides the model to follow the conversation and ask only what is missing', async () => {
    await service.chat('mèo 3kg', [{ role: 'user', content: 'Mình muốn tắm cho bé' }]);
    const request = mockGenerateContent.mock.calls[0][0];
    expect(request.config.systemInstruction).toContain('Không hỏi lại thông tin khách đã cung cấp');
    expect(request.config.systemInstruction).toContain('một câu hỏi');
    expect(request.config.systemInstruction).toContain('Không sao chép nguyên văn tài liệu kiến thức');
    expect(request.contents[0]).toEqual({ role: 'user', parts: [{ text: 'Mình muốn tắm cho bé' }] });
  });

  it('gives Gemini the current Vietnam date for relative appointment questions', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T17:30:00.000Z'));
    try {
      await service.chat('Ngày mai còn khung giờ nào?', []);
      const prompt = mockGenerateContent.mock.calls[0][0].config.systemInstruction;
      expect(prompt).toContain('2026-10-22');
      expect(prompt).toContain('Asia/Ho_Chi_Minh');
    } finally {
      vi.useRealTimers();
    }
  });

  it('removes emoji from model replies without changing prices', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      functionCalls: undefined,
      text: 'Mèo 🐱 giảm 👉 10.000đ nhé.',
    });

    const result = await service.chat('Giá thế nào?', []);

    expect(result.text).toBe('Mèo giảm 10.000đ nhé.');
  });

  it('removes emoji from domain fallback replies', async () => {
    (service as any).genAI = null;

    const result = await service.chat('Bé của tôi');

    expect(result.text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('uses live service data when Gemini requests a tool', async () => {
    const functionCall = { id: 'function-call-1', name: 'getServices', args: { category: 'CAT_SPA' } };
    mockKnowledgeService.getRelevantContext.mockResolvedValue('Giá và giới hạn cân nặng theo BA.');
    mockServicesService.findAll.mockResolvedValue([{ id: 'cat-spa', category: 'CAT_SPA' }]);
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [functionCall],
        candidates: [{ content: { role: 'model', parts: [{ functionCall }] } }],
        usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 4, totalTokenCount: 44 },
      })
      .mockResolvedValueOnce({
        functionCalls: undefined,
        text: 'Spa Mèo đang có trong danh mục.',
        usageMetadata: { promptTokenCount: 55, toolUsePromptTokenCount: 7, candidatesTokenCount: 12, totalTokenCount: 74 },
      });

    const result = await service.chat('Tư vấn Spa Mèo.', []);
    const followUpContents = mockGenerateContent.mock.calls[1][0].contents;

    expect(result.text).toContain('Spa Mèo');
    expect(mockServicesService.findAll).toHaveBeenCalledWith('CAT_SPA', undefined);
    expect(mockGenerateContent.mock.calls[0][0].contents[0].parts[0].text).toContain('Giá và giới hạn');
    expect(JSON.stringify(followUpContents)).toContain('cat-spa');
    expect(followUpContents[2].parts[0].functionResponse).toMatchObject({ id: 'function-call-1', name: 'getServices' });
    expect(mockPrisma.aiChatUsage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ inputTokens: 102, outputTokens: 16, totalTokens: 118 }),
    }));
  });

  it('uses an honest fallback when service data is unavailable', async () => {
    const result = await (service as any).generateFallbackResponse('Tư vấn spa và cắt tỉa');
    expect(result).toContain('chưa có dữ liệu dịch vụ');
    expect(result).not.toContain('Quy trình 5 bước');
    expect(result).not.toContain('Silver');
  });

  it('directs unclear fallback questions to staff instead of returning an unrelated policy chunk', async () => {
    (service as any).genAI = null;
    mockKnowledgeService.getLexicalAnswer.mockReturnValue('');

    const result = await service.chat('Còn gì nữa?', []);

    expect(result.source).toBe('fallback');
    expect(result.text).toContain('Mình chưa chắc thông tin này.');
    expect(result.text).toContain('/lien-he');
    expect(result.text).not.toContain('Bạn kể thêm');
  });

  it('explains the booking steps when a customer asks what to do to book', async () => {
    const result = await (service as any).generateFallbackResponse(
      'Tôi muốn đặt lịch Spa cho mèo thì cần làm gì?',
    );

    expect(result).toContain('đăng nhập');
    expect(result).toContain('chọn hồ sơ mèo');
    expect(result).toContain('Tắm và chăm sóc lông cho mèo');
    expect(result).toContain('/dat-lich');
    expect(result).toContain('nhân viên cân lại');
    expect(result).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('answers a specific cat service price without listing unrelated services', async () => {
    mockServicesService.findAll.mockResolvedValue([
      {
        name: 'Tắm và chăm sóc lông cho mèo',
        category: 'CAT_SPA',
        isAddon: false,
        priceTiers: [
          { minWeight: 0, maxWeight: 5, price: 220000, species: 'CAT' },
          { minWeight: 5, maxWeight: 20, price: 300000, species: 'CAT' },
        ],
      },
      {
        name: 'Cắt tỉa và tạo kiểu theo yêu cầu',
        category: 'GROOMING',
        isAddon: false,
        priceTiers: [{ minWeight: 0, maxWeight: 5, price: 350000, species: 'DOG' }],
      },
    ]);

    const result = await (service as any).generateFallbackResponse('Mèo 5 kg tắm Spa bao nhiêu tiền?');

    expect(result).toContain('Tắm và chăm sóc lông cho mèo');
    expect(result).toContain('300.000');
    expect(result).not.toContain('Cắt tỉa và tạo kiểu');
  });

  it('answers business hours separately from available appointment slots', async () => {
    const result = await (service as any).generateFallbackResponse('Giờ hoạt động Spa của PetCare thế nào?');

    expect(result).toContain('08:30–18:30');
    expect(result).toContain('08:30–20:30');
    expect(result).not.toContain('khung giờ còn chỗ');
    expect(mockBookingsService.getAvailableSlots).not.toHaveBeenCalled();
  });

  it('refers health symptoms to a veterinarian instead of recommending a grooming service', async () => {
    const result = await (service as any).generateFallbackResponse('Thú cưng bị viêm tai nên dùng dịch vụ nào?');

    expect(result).toContain('bác sĩ thú y');
    expect(result).not.toContain('Dịch vụ và bảng giá đang áp dụng');
    expect(mockServicesService.findAll).not.toHaveBeenCalled();
  });

  it('instructs the model to refer health concerns to a veterinarian', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'Bạn nên đưa bé đến bác sĩ thú y để kiểm tra tai.' });
    const result = await service.chat('Mèo bị viêm tai, nên dùng thuốc nào?', []);

    expect(result.text).toContain('bác sĩ thú y');
    expect(result.source).toBe('model');
    expect(mockGenerateContent.mock.calls[0][0].config.systemInstruction).toContain('Không chẩn đoán/chữa bệnh');
  });

  it('lets the model explain a tool error without switching to fallback', async () => {
    mockServicesService.findAll.mockRejectedValue(new Error('database unavailable'));
    mockGenerateContent.mockResolvedValueOnce({ functionCalls: [{ name: 'getServices', args: {} }] })
      .mockResolvedValueOnce({ text: 'Mình chưa tra được bảng giá lúc này.' });
    expect(await service.chat('giá tắm mèo thế nào', [])).toMatchObject({ source: 'model', text: 'Mình chưa tra được bảng giá lúc này.' });
    expect(mockKnowledgeService.getLexicalAnswer).not.toHaveBeenCalled();
  });

  it('treats empty provider output as a model failure and recovers next turn', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: ' ' }).mockResolvedValueOnce({ text: 'Mình nghe đây.' });
    expect(await service.chat('hello', [])).toMatchObject({ source: 'fallback' });
    expect(await service.chat('hello', [])).toMatchObject({ source: 'model', text: 'Mình nghe đây.' });
  });

  it('lets the model finish after the tool budget and pairs every function call', async () => {
    mockGenerateContent.mockResolvedValueOnce({ functionCalls: Array.from({ length: 6 }, (_, i) => ({ id: `call-${i}`, name: 'getServices', args: {} })) })
      .mockResolvedValueOnce({ text: 'Đây là thông tin mình đã tra được.' });
    expect(await service.chat('xem dịch vụ', [])).toMatchObject({ source: 'model', text: 'Đây là thông tin mình đã tra được.' });
    const finalRequest = mockGenerateContent.mock.calls[1][0];
    expect(finalRequest.config.toolConfig.functionCallingConfig.mode).toBe('NONE');
    expect(finalRequest.contents.at(-1).parts).toHaveLength(6);
    expect(mockServicesService.findAll).toHaveBeenCalledTimes(5);
  });

  it('builds product choices from sellable database rows, never invented model prices', async () => {
    mockProductsService.recommend.mockResolvedValue([
      { id: 'cat', name: 'Hạt mèo', slug: 'hat-meo', category: 'FOOD', suitableSpecies: 'CAT', price: 45000, stock: 3 },
      { id: 'sold-out', suitableSpecies: 'CAT', price: 45000, stock: 0 },
      { id: 'dog', suitableSpecies: 'DOG', price: 45000, stock: 3 },
    ]);
    mockGenerateContent.mockResolvedValueOnce({ functionCalls: [{ name: 'showChoices', args: { kind: 'products', species: 'CAT', weightKg: 5, price: 1 } }] })
      .mockResolvedValueOnce({ text: 'Bạn xem sản phẩm bên dưới nhé.' });
    const result = await service.chat('tìm hạt cho mèo 5kg', []);
    expect(result.source).toBe('model');
    expect(result.workflow?.products).toHaveLength(1);
    expect(result.workflow?.products?.[0]).toMatchObject({ id: 'cat', price: 45000 });
  });

  it('explains delivery by supported ward and store pickup when outside the area', async () => {
    const result = await (service as any).generateFallbackResponse('Mua pate có giao về nhà không?');

    expect(result).toContain('nhận tại cửa hàng');
    expect(result).toContain('phường/xã');
    expect(result).toContain('Phí giao');
    expect(result).not.toContain('Một số sản phẩm đang còn hàng');
  });

  it('checks stock for the product named by the customer', async () => {
    mockProductsService.findAll.mockResolvedValue({
      data: [{
        id: 'product-1',
        name: 'Pate Súp Thưởng Ciao Churu Vị Cá Ngừ (Gói 4 thanh x 14g)',
        slug: 'pate-ciao-churu-meo-ca-ngu',
        price: 45000,
        stock: 3,
      }],
      meta: { total: 1 },
    });

    const result = await (service as any).generateFallbackResponse('Pate Ciao Churu vị cá ngừ hiện còn hàng không?');

    expect(result).toContain('còn 3 sản phẩm khả dụng');
    expect(result).toContain('/cua-hang/pate-ciao-churu-meo-ca-ngu');
    expect(result).not.toContain('Một số sản phẩm đang còn hàng');
  });

  it.each([
    ['Pate Ciao Churu giá bao nhiêu?', 'Pate Ciao Churu', 'pate-ciao-churu', 45000],
    ['Sữa tắm SOS giá bao nhiêu?', 'Sữa tắm SOS', 'sua-tam-sos', 120000],
  ])('answers the product price for %s rather than Spa prices', async (message, name, slug, price) => {
    mockProductsService.findAll.mockResolvedValue({
      data: [{ id: 'product-1', name, slug, price, stock: 3 }],
      meta: { total: 1 },
    });

    const result = await (service as any).generateFallbackResponse(message);

    expect(result).toContain(name);
    expect(result).toContain(`${Number(price).toLocaleString('vi-VN')}đ`);
    expect(result).toContain(`/cua-hang/${slug}`);
    expect(mockServicesService.findAll).not.toHaveBeenCalled();
  });

  it.each([
    ['Cửa hàng tắm Spa cho chó 4 kg giá bao nhiêu?', 'BATH'],
    ['Chó 4 kg cắt tỉa giá bao nhiêu?', 'GROOMING'],
  ])('keeps the service and species correct for %s', async (message, category) => {
    mockServicesService.findAll.mockResolvedValue([{
      name: 'Dịch vụ đã chọn', category, isAddon: false,
      priceTiers: [{ species: 'DOG', minWeight: 0, maxWeight: 5, price: 180000 }],
    }]);

    const result = await (service as any).generateFallbackResponse(message);

    expect(result).toContain('chó 4 kg: giá tham khảo 180.000đ');
    expect(mockProductsService.findAll).not.toHaveBeenCalled();
  });

  it('lets Gemini look up a named product and see that it is out of stock', async () => {
    const product = { id: 'p1', name: 'Pate Ciao Churu', stock: 0, price: 45000 };
    mockProductsService.findAll.mockResolvedValue({ data: [product] });

    const result = await (service as any).dispatchFunction('getProducts', { search: 'Ciao Churu' });

    expect(result).toEqual([product]);
    expect(mockProductsService.recommend).not.toHaveBeenCalled();
  });

  it('lists matching variants instead of choosing the first product as an exact match', async () => {
    mockProductsService.findAll.mockResolvedValue({
      data: [
        { id: 'tuna', name: 'Pate Ciao Churu cá ngừ', slug: 'ciao-ca-ngu', price: 45000, stock: 0 },
        { id: 'chicken', name: 'Pate Ciao Churu thịt gà', slug: 'ciao-thit-ga', price: 50000, stock: 3 },
      ],
    });

    const result = await (service as any).generateFallbackResponse('Pate Ciao Churu còn hàng không?');

    expect(result).toContain('Pate Ciao Churu cá ngừ');
    expect(result).toContain('Pate Ciao Churu thịt gà');
    expect(result).toContain('/cua-hang/ciao-ca-ngu');
    expect(result).toContain('/cua-hang/ciao-thit-ga');
    expect(result).toContain('loại nào');
  });

  it('does not recommend a named product that is out of stock', async () => {
    mockProductsService.findAll.mockResolvedValue({
      data: [{
        id: 'product-1',
        name: 'Pate Súp Thưởng Ciao Churu Vị Cá Ngừ (Gói 4 thanh x 14g)',
        slug: 'pate-ciao-churu-meo-ca-ngu',
        price: 45000,
        stock: 0,
      }],
      meta: { total: 1 },
    });

    const result = await (service as any).generateFallbackResponse('Pate Ciao Churu hiện còn hàng không?');

    expect(result).toContain('đang tạm hết hàng');
    expect(result).not.toContain('còn 0 sản phẩm khả dụng');
  });

  it('explains that only one promotion can be used on a receipt', async () => {
    const result = await (service as any).generateFallbackResponse('Voucher và ưu đãi đặt lịch Spa có cộng dồn không?');

    expect(result).toContain('một ưu đãi');
    expect(result).toContain('không cộng dồn');
    expect(result).toContain('5%');
    expect(result).not.toMatch(/qinpet/i);
  });

  it('explains the manual confirmation step for online order transfers', async () => {
    const result = await (service as any).generateFallbackResponse('Đơn online đã chuyển khoản thì khi nào được xử lý?');

    expect(result).toContain('nhân viên');
    expect(result).toContain('SePay');
    expect(result).toContain('xác nhận');
  });

  it('explains how points are earned and redeemed', async () => {
    const result = await (service as any).generateFallbackResponse('Tích điểm và đổi điểm thế nào?');

    expect(result).toContain('10.000');
    expect(result).toContain('voucher');
    expect(result).toContain('không đổi thành tiền');
    expect(result).toContain('giảm trực tiếp hóa đơn');
  });

  it('gives the four-hour change and cancellation window', async () => {
    const result = await (service as any).generateFallbackResponse('Tôi có thể đổi hoặc hủy lịch trước bao lâu?');

    expect(result).toContain('4 tiếng');
    expect(result).toContain('liên hệ hỗ trợ');
    expect(mockBookingsService.getAvailableSlots).not.toHaveBeenCalled();
  });

  it('explains that no-show is marked by staff after the 20-minute grace period', async () => {
    const result = await (service as any).generateFallbackResponse('Nếu khách không đến thì sao?');

    expect(result).toContain('20 phút');
    expect(result).toContain('nhân viên');
    expect(result).toContain('lý do');
  });

  it('lists every active service with its weight prices in the fallback', async () => {
    mockServicesService.findAll.mockResolvedValue([
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `service-${index + 1}`,
        name: `Dịch vụ ${index + 1}`,
        category: 'BATH',
        priceTiers: [{ minWeight: 0, maxWeight: 20, price: 100000 }],
      })),
      {
        id: 'grooming',
        name: 'Cắt tỉa và tạo kiểu theo yêu cầu',
        category: 'GROOMING',
        priceTiers: [
          { minWeight: 0, maxWeight: 5, price: 350000 },
          { minWeight: 5, maxWeight: 10, price: 480000 },
          { minWeight: 10, maxWeight: 20, price: 650000 },
        ],
      },
    ]);

    const result = await (service as any).generateFallbackResponse('Bảng giá theo kg');

    expect(result).toContain('Cắt tỉa và tạo kiểu theo yêu cầu');
    expect(result).toContain('Từ 10 đến tối đa 20 kg: 650.000 đ');
  });

  it('politely refuses service requests above 20 kg without listing the full catalog', async () => {
    const result = await (service as any).generateFallbackResponse(
      'Khách có chó nặng 21 kg muốn tắm Spa. PetCare có nhận không?',
    );

    expect(result).toContain('Rất tiếc');
    expect(result).toContain('21 kg');
    expect(result).toContain('20 kg');
    expect(result).not.toContain('Dịch vụ và bảng giá đang áp dụng');
    expect(mockServicesService.findAll).not.toHaveBeenCalled();
  });

  it('keeps exactly 20 kg within the accepted service limit', async () => {
    mockServicesService.findAll.mockResolvedValue([
      {
        name: 'Tắm Spa và dưỡng lông',
        category: 'BATH',
        priceTiers: [{ minWeight: 10, maxWeight: 20, price: 350000 }],
      },
    ]);

    const result = await (service as any).generateFallbackResponse(
      'Chó nặng đúng 20 kg có thể tắm Spa không?',
    );

    expect(result).not.toContain('Rất tiếc');
    expect(result).toContain('Tắm Spa và dưỡng lông');
    expect(result).toContain('20 kg: giá tham khảo 350.000đ');
  });

  it('should stream fallback chunks when gemini is unavailable or in rule mode', async () => {
    // Test fallback stream
    const chunks: string[] = [];
    await (service as any).fallbackStream('tư vấn spa và cắt tỉa', undefined, (chunk: string) => {
      chunks.push(chunk);
    });
    expect(chunks.length).toBeGreaterThan(0);
    const combined = chunks.join('');
    expect(combined).toContain('chưa có dữ liệu dịch vụ');
    expect(combined).not.toContain('Quy trình 5 bước');
  });

  it('preserves spaces between streamed assistant chunks', async () => {
    const response = 'Tắm Spa: dưới 5 kg: 180.000đ; từ 5 đến dưới 10 kg: 250.000đ. Giá tham khảo theo cân nặng khai báo; nhân viên sẽ cân lại và xác nhận trước khi thực hiện.';
    mockGenerateContent.mockResolvedValueOnce({ functionCalls: undefined, text: response });
    const chunks: string[] = [];

    await service.chatStream('Bảng giá dịch vụ Spa tính theo các nấc cân nặng như thế nào?', [], undefined, (chunk) => {
      chunks.push(chunk);
    });

    expect(chunks.join('')).toBe(response);
  });
});
