import { Test, TestingModule } from '@nestjs/testing';
import { AiAssistantController } from './ai-assistant.controller.js';
import { AiAssistantService } from './ai-assistant.service.js';
import { PetsService } from '../pets/pets.service.js';
import { AiWorkflowService } from './ai-workflow.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('AiAssistantController', () => {
  let controller: AiAssistantController;
  let mockAiService: any;
  let mockPetsService: any;

  beforeEach(async () => {
    mockAiService = {
      chat: vi.fn().mockResolvedValue({ text: 'Phản hồi từ AI' }),
      chatStream: vi.fn().mockImplementation(async (msg, history, userId, onChunk, onMetadata) => {
        onMetadata?.({ source: 'model', workflow: { kind: 'booking', species: 'CAT' } });
        onChunk('Token 1 ');
        onChunk('Token 2');
      }),
    };
    mockPetsService = {
      findAllByUser: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Mochi' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiAssistantController],
      providers: [
        { provide: AiAssistantService, useValue: mockAiService },
        { provide: PetsService, useValue: mockPetsService },
        { provide: AiWorkflowService, useValue: { reply: vi.fn().mockResolvedValue({ text: 'Không được thay câu trả lời model bằng mẫu từ khóa' }) } },
      ],
    }).compile();

    controller = module.get<AiAssistantController>(AiAssistantController);
  });

  it('should call chat with message, history and userId', async () => {
    const dto = { message: 'Xin chào', history: [] };
    const user = { id: 'u1' } as any;
    const requestKey = 'chat-controller-0001';

    const res = await controller.chat(dto, user, requestKey);
    expect(mockAiService.chat).toHaveBeenCalledWith('Xin chào', [], 'u1', requestKey);
    expect(res).toEqual({ text: 'Phản hồi từ AI' });
  });

  it('should stream chunks and write SSE headers on chatStream', async () => {
    const dto = { message: 'Tư vấn spa' };
    const user = { id: 'u1' } as any;
    const requestKey = 'chat-stream-controller-0001';

    const written: string[] = [];
    const headers: Record<string, string> = {};

    const mockRes = {
      setHeader: vi.fn((k, v) => {
        headers[k] = v;
      }),
      flushHeaders: vi.fn(),
      on: vi.fn(),
      write: vi.fn((data: string) => {
        written.push(data);
      }),
      end: vi.fn(),
    } as any;

    await controller.chatStream(dto, mockRes, user, requestKey);

    expect(headers['Content-Type']).toBe('text/event-stream; charset=utf-8');
    expect(mockAiService.chatStream).toHaveBeenCalled();
    expect(mockAiService.chatStream).toHaveBeenCalledWith('Tư vấn spa', [], 'u1', expect.any(Function), expect.any(Function), requestKey);
    expect(written).toContain('data: {"source":"model","workflow":{"kind":"booking","species":"CAT"}}\n\n');
    expect(written).toContain('data: {"text":"Token 1 "}\n\n');
    expect(written).toContain('data: {"text":"Token 2"}\n\n');
    expect(written).toContain('data: [DONE]\n\n');
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('requires an idempotency key for chat requests', async () => {
    await expect(controller.chat({ message: 'Xin chào' }, undefined))
      .rejects.toThrow('Thiếu hoặc sai mã yêu cầu');
    expect(mockAiService.chat).not.toHaveBeenCalled();
  });

  it('rejects a streaming request without an idempotency key before opening SSE', async () => {
    const mockRes = {
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as any;

    await expect(controller.chatStream({ message: 'Xin chào' }, mockRes, undefined))
      .rejects.toThrow('Thiếu hoặc sai mã yêu cầu');

    expect(mockRes.setHeader).not.toHaveBeenCalled();
    expect(mockRes.flushHeaders).not.toHaveBeenCalled();
    expect(mockAiService.chatStream).not.toHaveBeenCalled();
  });

  it('should get pets context for current user', async () => {
    const user = { id: 'u1' } as any;
    const res = await controller.getContext(user);
    expect(mockPetsService.findAllByUser).toHaveBeenCalledWith('u1');
    expect(res).toEqual([{ id: 'p1', name: 'Mochi' }]);
  });
});
