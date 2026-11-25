import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AiKnowledgeService } from './ai-knowledge.service.js';

const { embedContent } = vi.hoisted(() => ({ embedContent: vi.fn() }));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { embedContent }; } }));

describe('knowledge index lifecycle', () => {
  let directory: string;
  const makeService = (key = 'test-key', model = 'gemini-embedding-001') => new AiKnowledgeService({
    get: (name: string) => ({ GEMINI_API_KEY: key, GEMINI_EMBEDDING_MODEL: model, AI_KNOWLEDGE_INDEX_PATH: join(directory, 'index.json') })[name],
  } as any);

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'petcare-knowledge-test-'));
    embedContent.mockReset().mockImplementation(({ contents }: { contents: string | string[] }) => Promise.resolve({
      embeddings: (Array.isArray(contents) ? contents : [contents]).map(() => ({ values: Array.from({ length: 768 }, (_, i) => i === 0 ? 1 : 0) })),
    }));
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it('persists vectors and reuses them after restart instead of charging for reindexing', async () => {
    await makeService().onModuleInit();
    expect(existsSync(join(directory, 'index.json'))).toBe(true);
    await makeService().onModuleInit();
    expect(embedContent).toHaveBeenCalledTimes(1);
  });

  it('rebuilds an index from another embedding model or a broken cache', async () => {
    writeFileSync(join(directory, 'index.json'), '{broken');
    await makeService().onModuleInit();
    await makeService('test-key', 'another-embedding-model').onModuleInit();
    expect(embedContent).toHaveBeenCalledTimes(2);
  });

  it('serves approved preparation guidance when no API key is configured', async () => {
    const service = makeService('');
    await service.onModuleInit();
    const text = await service.getRelevantContext('chuan bi truoc buoi hen');
    expect(text).toContain('tiền sử dị ứng');
    expect(text).toContain('03-buoi-hen.md');
    expect(embedContent).not.toHaveBeenCalled();
  });

  it('falls back to document retrieval when the embedding provider is unavailable', async () => {
    const service = makeService();
    embedContent.mockRejectedValue(new Error('provider unavailable'));
    await service.onModuleInit();
    const text = await service.getRelevantContext('chuẩn bị trước buổi hẹn');
    expect(text).toContain('tiền sử dị ứng');
    await expect(service.getRelevantContext('bitcoin ethereum')).resolves.toBe('');
  });
});
