import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AiKnowledgeService } from './ai-knowledge.service.js';

@Injectable()
export class AiAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeService: AiKnowledgeService,
  ) {}

  async getOverview(rangeDays = 7) {
    if (![7, 30].includes(rangeDays)) {
      throw new BadRequestException('Chỉ hỗ trợ xem mức sử dụng 7 hoặc 30 ngày.');
    }
    const startOfDay = this.getVietnamStartOfDay();
    const rangeStart = new Date(startOfDay.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
    const knowledge = this.knowledgeService.getStatus();
    const [settings, modelRequests, totalRequests, fallbackRequests, providerErrors, tokenUsage, recentRequests, usageRows] = await Promise.all([
      this.prisma.aiAssistantSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', dailyRequestLimit: 1000 },
        update: {},
      }),
      this.prisma.aiChatUsage.count({ where: { createdAt: { gte: startOfDay }, modelRequest: true } }),
      this.prisma.aiChatUsage.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.aiChatUsage.count({ where: { createdAt: { gte: startOfDay }, source: 'fallback' } }),
      this.prisma.aiChatUsage.count({ where: { createdAt: { gte: startOfDay }, status: { not: null } } }),
      this.prisma.aiChatUsage.aggregate({
        where: { createdAt: { gte: startOfDay }, modelRequest: true },
        _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      }),
      this.prisma.aiChatUsage.findMany({
        where: { createdAt: { gte: rangeStart } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          requestId: true,
          source: true,
          model: true,
          durationMs: true,
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.$queryRaw<Array<{
        date: string;
        source: string;
        modelRequest: boolean;
        requests: number;
        providerErrors: number;
      }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('day', "createdAt" + INTERVAL '7 hours'), 'YYYY-MM-DD') AS "date",
          "source",
          "modelRequest",
          COUNT(*)::int AS "requests",
          COUNT(*) FILTER (WHERE "status" IS NOT NULL)::int AS "providerErrors"
        FROM "ai_chat_usages"
        WHERE "createdAt" >= ${rangeStart}
        GROUP BY 1, 2, 3
        ORDER BY 1 ASC
      `,
    ]);

    const formatDate = (date: Date) => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
    const dailyUsage = Array.from({ length: rangeDays }, (_, index) => {
      const date = new Date(rangeStart.getTime() + index * 24 * 60 * 60 * 1000);
      return {
        date: formatDate(date),
        totalRequests: 0,
        modelRequests: 0,
        fallbackResponses: 0,
        providerErrors: 0,
      };
    });
    const usageByDate = new Map(dailyUsage.map((day) => [day.date, day]));
    for (const row of usageRows) {
      const day = usageByDate.get(row.date);
      if (!day) continue;
      const count = Number(row.requests);
      day.totalRequests += count;
      if (row.modelRequest) day.modelRequests += count;
      if (row.source === 'fallback') day.fallbackResponses += count;
      day.providerErrors += Number(row.providerErrors);
    }

    return {
      rangeDays,
      dailyRequestLimit: settings.dailyRequestLimit,
      modelRequestsToday: modelRequests,
      totalRequestsToday: totalRequests,
      fallbackRequestsToday: fallbackRequests,
      providerErrorsToday: providerErrors,
      remainingModelRequests: Math.max(0, settings.dailyRequestLimit - modelRequests),
      providerTokenUsageToday: tokenUsage._sum,
      dailyUsage,
      knowledge,
      recentRequests,
    };
  }

  async getDashboard(page = 1) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const pageSize = 20;
    const requestSelect = {
      requestId: true,
      source: true,
      model: true,
      durationMs: true,
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      reason: true,
      status: true,
      createdAt: true,
    } as const;
    const issueWhere = { OR: [{ source: 'fallback' }, { status: { not: null } }] };
    const [overview, issueCount, issues, recentSuccess] = await Promise.all([
      this.getOverview(7),
      this.prisma.aiChatUsage.count({ where: issueWhere }),
      this.prisma.aiChatUsage.findMany({
        where: issueWhere,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * pageSize,
        take: pageSize,
        select: requestSelect,
      }),
      this.prisma.aiChatUsage.findMany({
        where: { source: 'model', status: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: requestSelect,
      }),
    ]);
    return {
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite',
      keyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      dailyRequestLimit: overview.dailyRequestLimit,
      modelRequestsToday: overview.modelRequestsToday,
      remainingModelRequests: overview.remainingModelRequests,
      fallbackRequestsToday: overview.fallbackRequestsToday,
      providerErrorsToday: overview.providerErrorsToday,
      providerTokenUsageToday: overview.providerTokenUsageToday,
      issueCount,
      issues,
      issuePage: safePage,
      issuePageSize: pageSize,
      recentSuccess,
    };
  }

  getUsage(requestId: string) {
    return this.prisma.aiChatUsage.findUnique({
      where: { requestId },
      select: {
        requestId: true,
        source: true,
        model: true,
        durationMs: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async updateSettings(dailyRequestLimit: number) {
    if (!Number.isInteger(dailyRequestLimit) || dailyRequestLimit < 1 || dailyRequestLimit > 100_000) {
      throw new BadRequestException('Giới hạn lượt gọi mỗi ngày phải từ 1 đến 100.000.');
    }
    const settings = await this.prisma.aiAssistantSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', dailyRequestLimit },
      update: { dailyRequestLimit },
    });
    return { dailyRequestLimit: settings.dailyRequestLimit };
  }

  listKnowledge() {
    return this.prisma.aiKnowledgeEntry.findMany({ orderBy: [{ enabled: 'desc' }, { updatedAt: 'desc' }] });
  }

  async createKnowledgeEntry(input: {
    title: string;
    answer?: string;
    content: string;
    source?: string;
    reviewedAt?: string;
  }) {
    const entry = await this.prisma.aiKnowledgeEntry.create({
      data: {
        id: randomUUID(),
        title: input.title.trim(),
        answer: input.answer?.trim() || null,
        content: input.content.trim(),
        source: input.source?.trim() || 'Nội dung do quản trị viên thêm',
        reviewedAt: input.reviewedAt || new Date().toISOString().slice(0, 10),
      },
    });
    await this.knowledgeService.refreshKnowledgeBase();
    return entry;
  }

  async updateKnowledgeEntry(id: string, input: {
    title: string;
    answer?: string;
    content: string;
    source: string;
    reviewedAt: string;
  }) {
    const entry = await this.prisma.aiKnowledgeEntry.update({
      where: { id },
      data: {
        title: input.title.trim(),
        answer: input.answer?.trim() || null,
        content: input.content.trim(),
        source: input.source.trim(),
        reviewedAt: input.reviewedAt,
      },
    });
    await this.knowledgeService.refreshKnowledgeBase();
    return entry;
  }

  async setKnowledgeEnabled(id: string, enabled: boolean) {
    const entry = await this.prisma.aiKnowledgeEntry.update({ where: { id }, data: { enabled } });
    await this.knowledgeService.refreshKnowledgeBase();
    return entry;
  }

  private getVietnamStartOfDay(): Date {
    const localTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
    localTime.setUTCHours(0, 0, 0, 0);
    return new Date(localTime.getTime() - 7 * 60 * 60 * 1000);
  }
}
