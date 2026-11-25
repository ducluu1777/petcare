import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PETCARE_KNOWLEDGE_BASE } from './ai-knowledge.base.js';
import { KnowledgeDocumentVector, rankKnowledgeDocuments } from './ai-assistant.utils.js';
import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { knowledgeFingerprint, rankLexicalKnowledge, type KnowledgeChunk } from './ai-knowledge.documents.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class AiKnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(AiKnowledgeService.name);
  private readonly genAI: GoogleGenAI | null;
  private readonly model: string;
  private knowledgeBase: KnowledgeChunk[] = [...PETCARE_KNOWLEDGE_BASE];
  private indexedDocuments: KnowledgeDocumentVector[] = [];
  private readonly indexPath: string;
  private fingerprint = knowledgeFingerprint(this.knowledgeBase);

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = apiKey ? new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 10_000, retryOptions: { attempts: 1 } },
    }) : null;
    this.model = this.configService.get<string>('GEMINI_EMBEDDING_MODEL') || 'gemini-embedding-001';
    this.indexPath = resolve(this.configService.get<string>('AI_KNOWLEDGE_INDEX_PATH') || '.cache/ai/knowledge-index.json');
  }

  async onModuleInit(): Promise<void> {
    await this.refreshKnowledgeBase(false);
    if (!this.genAI) return;
    if (await this.restoreIndex()) return;
    await this.rebuildIndex();
  }

  private async rebuildIndex(): Promise<void> {
    if (!this.genAI || !this.knowledgeBase.length) return;
    try {
      const result = await this.genAI.models.embedContent({
        model: this.model,
        contents: this.knowledgeBase.map((document) => `${document.title}\n${document.answer ?? ''}\n${document.content}`),
        config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 768 },
      });

      const documents = this.knowledgeBase.map((document, index) => {
        const values = result.embeddings?.[index]?.values;
        if (!this.validVector(values)) throw new Error('Embedding không đủ 768 chiều hợp lệ.');
        return { ...document, embedding: values };
      });
      this.indexedDocuments = documents;
      await this.persistIndex();
      this.logger.log(`Đã lập chỉ mục ${documents.length} đoạn kiến thức từ ${this.getStatus().sources} tài liệu.`);
    } catch (error) {
      this.logger.warn(`Không thể tạo vector cho dữ liệu PetCare: ${this.getErrorMessage(error)}`);
    }
  }

  async getRelevantContext(query: string, requestId?: string): Promise<string> {
    if (!query.trim()) return '';
    let rankedDocuments: Array<KnowledgeChunk & { score: number }> = [];
    let strategy: 'semantic' | 'lexical' = 'lexical';

    try {
      if (this.genAI && this.indexedDocuments.length) {
        const result = await this.genAI.models.embedContent({
        model: this.model,
        contents: query,
        config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 },
      });
        const queryEmbedding = result.embeddings?.[0]?.values;
        if (queryEmbedding?.length) {
          const ranked = rankKnowledgeDocuments(queryEmbedding, this.indexedDocuments, 4, 0.35);
        rankedDocuments = ranked.flatMap(result => {
            const document = this.knowledgeBase.find(item => item.id === result.id);
          return document ? [{ ...document, score: result.score }] : [];
          });
        if (rankedDocuments.length) strategy = 'semantic';
      }
      }
    } catch (error) {
      this.logger.warn(`Không thể tìm vector kiến thức PetCare: ${this.getErrorMessage(error)}`);
    }
    if (!rankedDocuments.length) rankedDocuments = rankLexicalKnowledge(query, this.knowledgeBase, 3);
    this.logger.log(JSON.stringify({
      event: 'ai_knowledge_retrieval',
      requestId,
      strategy,
      documents: rankedDocuments.map(({ id, score }) => ({ id, score: Number(score.toFixed(3)) })),
    }));
    return rankedDocuments.map(({ answer, ...document }) => `[${document.id}] ${document.title}\nNguồn: ${document.source}; rà soát ${document.reviewedAt}\n${answer ? `Trả lời gợi ý: ${answer}\n` : ''}${document.content}`).join('\n\n');
  }

  getLexicalAnswer(query: string, requestId?: string): string {
    const match = rankLexicalKnowledge(query, this.knowledgeBase, 1)[0];
    this.logger.log(JSON.stringify({
      event: 'ai_knowledge_retrieval',
      requestId,
      strategy: 'lexical_answer',
      documents: match ? [{ id: match.id, score: Number(match.score.toFixed(3)) }] : [],
    }));
    return match && match.score >= 0.45 ? match.answer ?? '' : '';
  }

  getStatus() {
    return { sources: new Set(this.knowledgeBase.map(document => document.source)).size, chunks: this.knowledgeBase.length, indexedChunks: this.indexedDocuments.length, model: this.model, fingerprint: this.fingerprint };
  }

  async refreshKnowledgeBase(rebuildEmbeddings = true): Promise<void> {
    if (!this.prisma) return;
    try {
      await this.prisma.aiKnowledgeEntry.createMany({
        data: PETCARE_KNOWLEDGE_BASE.map(document => ({
          id: document.id,
          title: document.title,
          answer: document.answer,
          content: document.content,
          source: document.source,
          reviewedAt: document.reviewedAt,
        })),
        skipDuplicates: true,
      });
      const entries = await this.prisma.aiKnowledgeEntry.findMany({
        where: { enabled: true },
        orderBy: { id: 'asc' },
      });
      this.knowledgeBase = entries.map(({ id, title, answer, content, source, reviewedAt }) => ({
        id,
        title,
        ...(answer ? { answer } : {}),
        content,
        source,
        reviewedAt,
      }));
      this.fingerprint = knowledgeFingerprint(this.knowledgeBase);
      this.indexedDocuments = [];
      if (rebuildEmbeddings) await this.rebuildIndex();
    } catch (error) {
      this.logger.warn(`Không thể tải knowledge base từ cơ sở dữ liệu; tiếp tục dùng tài liệu đóng gói: ${this.getErrorMessage(error)}`);
    }
  }

  async listKnowledgeEntries() {
    if (!this.prisma) return PETCARE_KNOWLEDGE_BASE.map(entry => ({ ...entry, enabled: true }));
    return this.prisma.aiKnowledgeEntry.findMany({
      orderBy: [{ enabled: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  private validVector(values: unknown): values is number[] {
    return Array.isArray(values) && values.length === 768 && values.every(value => typeof value === 'number' && Number.isFinite(value)) && values.some(value => value !== 0);
  }

  private async restoreIndex(): Promise<boolean> {
    try {
      const cached = JSON.parse(await readFile(this.indexPath, 'utf8'));
      if (cached.version !== 1 || cached.model !== this.model || cached.fingerprint !== this.fingerprint || !Array.isArray(cached.chunks) || cached.chunks.length !== this.knowledgeBase.length) return false;
      const documents: KnowledgeDocumentVector[] = [];
      for (let index = 0; index < this.knowledgeBase.length; index++) {
        const document = this.knowledgeBase[index];
        const cachedChunk = cached.chunks[index];
        if (cachedChunk?.id !== document.id || !this.validVector(cachedChunk.embedding)) return false;
        documents.push({ ...document, embedding: cachedChunk.embedding });
      }
      this.indexedDocuments = documents;
      this.logger.log(`Đã nạp ${documents.length} vector kiến thức từ chỉ mục đã lưu.`);
      return true;
    } catch {
      return false;
    }
  }

  private async persistIndex(): Promise<void> {
    const temporaryPath = `${this.indexPath}.${randomUUID()}.tmp`;
    try {
      await mkdir(dirname(this.indexPath), { recursive: true });
      await writeFile(temporaryPath, JSON.stringify({ version: 1, model: this.model, fingerprint: this.fingerprint, chunks: this.indexedDocuments.map(({ id, embedding }) => ({ id, embedding })) }), { mode: 0o600 });
      await rename(temporaryPath, this.indexPath);
    } catch {
      this.logger.warn('Không lưu được chỉ mục AI; tra cứu vẫn dùng chỉ mục trong bộ nhớ. Kiểm tra quyền ghi AI_KNOWLEDGE_INDEX_PATH.');
    } finally {
      await unlink(temporaryPath).catch(() => {});
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'lỗi không xác định';
  }
}
