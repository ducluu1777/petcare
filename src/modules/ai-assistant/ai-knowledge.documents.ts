import { createHash } from 'node:crypto';

export interface KnowledgeChunk {
  id: string;
  title: string;
  answer?: string;
  content: string;
  source: string;
  reviewedAt: string;
}

/** Sections may include a concise answer; long detail is split with overlapping context. */
export function parseKnowledgeMarkdown(
  source: string,
  markdown: string,
): KnowledgeChunk[] {
  const title = markdown.match(/^# (.+)$/m)?.[1]?.trim();
  const reviewedAt = markdown.match(
    /<!-- reviewed: (\d{4}-\d{2}-\d{2}) -->/,
  )?.[1];
  if (!title || !reviewedAt)
    throw new Error(`Tài liệu thiếu tiêu đề hoặc ngày rà soát: ${source}`);
  const clean = markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^# .+\r?\n/, '')
    .trim();
  const sections = clean.split(/^## /m).filter(Boolean);
  return sections.flatMap((section, sectionIndex) => {
    const newline = section.indexOf('\n');
    const heading = newline < 0 ? title : section.slice(0, newline).trim();
    let remaining =
      newline < 0 ? section.trim() : section.slice(newline + 1).trim();
    const answerMatch = remaining.match(
      /^### Trả lời nhanh\s*\n([\s\S]*?)(?=\n### |\n?$)/m,
    );
    const answer = answerMatch?.[1].trim();
    if (answerMatch)
      remaining = remaining
        .replace(answerMatch[0], '')
        .replace(/^\s*### Chi tiết\s*\n/, '')
        .trim();
    const chunks: KnowledgeChunk[] = [];
    while (remaining) {
      let end = Math.min(1600, remaining.length);
      if (end < remaining.length) {
        const naturalBreak = Math.max(
          remaining.lastIndexOf('\n', end),
          remaining.lastIndexOf(' ', end),
        );
        if (naturalBreak > 800) end = naturalBreak;
      }
      chunks.push({
        id: `${source}:${sectionIndex}:${chunks.length}`,
        title: `${title} — ${heading}`,
        ...(answer ? { answer } : {}),
        content: remaining.slice(0, end).trim(),
        source,
        reviewedAt,
      });
      if (end === remaining.length) break;
      const overlapStart = remaining.indexOf(' ', Math.max(0, end - 160));
      remaining = remaining
        .slice(overlapStart >= 0 && overlapStart < end ? overlapStart + 1 : end)
        .trim();
    }
    return chunks;
  });
}

const STOP_WORDS = new Set(
  'toi minh ban em anh chi la va cua cho cac mot nhung thi co duoc khong the nao gi voi khi ve can muon hoi petcare nhe a oi be hay tu o den de'.split(
    ' ',
  ),
);

function tokens(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/g, 'd')
        .match(/[a-z0-9]+/g) ?? [],
    ),
  ].filter((token) => !STOP_WORDS.has(token));
}

/** Keyword retrieval remains available when embedding is unavailable. */
export function rankLexicalKnowledge(
  query: string,
  documents: readonly KnowledgeChunk[],
  limit = 3,
): Array<KnowledgeChunk & { score: number }> {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];
  return documents
    .map((document) => {
      const titleTokens = new Set(tokens(document.title));
      const contentTokens = new Set(tokens(document.content));
      const matches = queryTokens.filter(
        (token) => titleTokens.has(token) || contentTokens.has(token),
      );
      const score =
        matches.reduce(
          (sum, token) => sum + (titleTokens.has(token) ? 4 : 1),
          0,
        ) / queryTokens.length;
      return { ...document, score, matches: matches.length };
    })
    .filter(
      (document) =>
        document.matches >= Math.min(2, queryTokens.length) &&
        document.matches / queryTokens.length >= 0.3,
    )
    .sort(
      (left, right) =>
        right.score - left.score || left.id.localeCompare(right.id),
    )
    .slice(0, limit)
    .map(({ matches: _matches, ...document }) => document);
}

export function knowledgeFingerprint(
  documents: readonly KnowledgeChunk[],
): string {
  return createHash('sha256').update(JSON.stringify(documents)).digest('hex');
}
