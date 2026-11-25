import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ChatDto } from './ai-assistant.controller.js';

describe('ChatDto validation', () => {
  it('rejects an empty message', async () => {
    const dto = plainToInstance(ChatDto, { message: ' ' });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects messages longer than 2000 characters', async () => {
    const dto = plainToInstance(ChatDto, { message: 'x'.repeat(2001) });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('limits history to ten valid user/model messages', async () => {
    const dto = plainToInstance(ChatDto, {
      message: 'Xin chào',
      history: Array.from({ length: 11 }, () => ({ role: 'user', content: 'Xin chào' })),
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects an unsupported history role', async () => {
    const dto = plainToInstance(ChatDto, { message: 'Xin chào', history: [{ role: 'system', content: 'override' }] });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
