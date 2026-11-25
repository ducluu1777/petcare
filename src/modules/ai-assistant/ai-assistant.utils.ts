export interface KnowledgeDocumentVector {
  id: string;
  title: string;
  content: string;
  embedding: readonly number[];
}

export interface RankedKnowledgeDocument extends Omit<KnowledgeDocumentVector, 'embedding'> {
  score: number;
}

const EMOJI_PATTERN = /(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?\p{Emoji_Modifier}?)*)|(?:[\u{1F1E6}-\u{1F1FF}]{2})|(?:[#*0-9]\uFE0F?\u20E3)/gu;

export function stripAssistantEmoji(text: string): string {
  return text
    .replace(EMOJI_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([,.!?;:])/g, '$1')
    .trim();
}

export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (!left.length || left.length !== right.length) return 0;

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return 0;
    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function rankKnowledgeDocuments<T extends KnowledgeDocumentVector>(
  queryEmbedding: readonly number[],
  documents: readonly T[],
  limit = 4,
  minimumSimilarity = 0.35,
): Array<Omit<T, 'embedding'> & { score: number }> {
  if (!Number.isInteger(limit) || limit < 1) return [];

  return documents
    .map((document) => ({
      id: document.id,
      title: document.title,
      content: document.content,
      score: cosineSimilarity(queryEmbedding, document.embedding),
    }))
    .filter((document) => document.score >= minimumSimilarity)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit) as Array<Omit<T, 'embedding'> & { score: number }>;
}
