import {
  getHumanSupportReply,
  getSocialReply,
  readConversationSpecies,
} from './ai-conversation.js';

export interface AiWorkflowPlan {
  kind: 'products' | 'booking';
  species?: 'CAT' | 'DOG';
  weightKg?: number;
  category?: 'FOOD' | 'SNACK' | 'CARE' | 'ACCESSORY';
  date?: string;
  search?: string;
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd');

function isTaskBoundary(message: string): boolean {
  return (
    !!getSocialReply(message) ||
    !!getHumanSupportReply(message) ||
    /\b(benh|viem|ngua|sot|bo an|non|tieu chay|chay mau|vet thuong|thuoc|dieu tri|trieu chung|huy lich|doi lich|huy don|hoan tien|voucher|thanh toan|nhan vien)\b/.test(
      normalize(message),
    ) ||
    /\b(?:khong|ko) (?:mua|dat)|\bdung lai\b/.test(normalize(message))
  );
}

// Fragments may fill a pending choice. An arbitrary short sentence is not a choice.
function isChoiceFragment(message: string): boolean {
  return /^(?:(?:be|nha|minh|toi|la|meo|cho|cun|cat|dog|nang|khoang|nhe|nha|a|kg|tuoi|thang|nam|mai|ngay|kia|hom|nay|buoi|sang|chieu|luc|gio|doi|thanh|sua|lai)|[\d.,/:+!?\s-])+$/.test(
    normalize(message).trim(),
  );
}

function productCategory(text: string): AiWorkflowPlan['category'] {
  return /\b(thuc an|hat|pate)\b/.test(text)
    ? 'FOOD'
    : /\b(banh thuong|snack)\b/.test(text)
      ? 'SNACK'
      : /\b(sua tam|cham soc|luoc)\b/.test(text)
        ? 'CARE'
        : /\b(phu kien|do dung)\b/.test(text)
          ? 'ACCESSORY'
          : undefined;
}

function topic(text: string): AiWorkflowPlan['kind'] | null {
  if (
    /\b(san pham|thuc an|pate|hat|banh thuong|phu kien|sua tam|mua)\b/.test(
      text,
    )
  )
    return 'products';
  const asksBookingPrice =
    /\b(gia|chi phi|muc phi|tinh phi|bao nhieu)\b/.test(text) &&
    /\b(dat lich|dat hen|booking)\b/.test(text);
  const explicitlyRequestsBooking =
    /\b(?:muon|can)\s+(?:dat lich|dat hen|tam|cat tia|grooming)\b/.test(text);
  if (asksBookingPrice && !explicitlyRequestsBooking) return null;
  if (
    /\b(dat lich|dat hen|booking|muon tam|can tam|muon cat tia|muon grooming)\b/.test(
      text,
    )
  )
    return 'booking';
  return null;
}

export function planAiWorkflow(
  message: string,
  history: { role: string; content: string }[],
  now = new Date(),
): AiWorkflowPlan | null {
  const normalized = normalize(message);
  if (isTaskBoundary(message)) return null;
  const currentTopic = topic(normalized);
  const startsNewRequest =
    /\b(mua|dat lich|dat hen|booking|muon tam|can tam|muon cat tia|muon grooming)\b/.test(
      normalized,
    );
  const isFollowUp = isChoiceFragment(message) || !!productCategory(normalized);
  const previous = history
    .filter((turn) => turn.role === 'user')
    .slice(-5)
    .reverse();
  const carried: string[] = [];
  let contextTurn: { role: string; content: string } | undefined;
  if (!startsNewRequest && isFollowUp) {
    for (const turn of previous) {
      if (isTaskBoundary(turn.content)) break;
      const priorTopic = topic(normalize(turn.content));
      if (priorTopic) {
        contextTurn = turn;
        break;
      }
      if (!isChoiceFragment(turn.content)) break;
      carried.unshift(turn.content);
    }
  }
  const kind =
    currentTopic ??
    (contextTurn ? topic(normalize(contextTurn.content)) : null);
  if (!kind) return null;
  const context =
    contextTurn && topic(normalize(contextTurn.content)) === kind
      ? [contextTurn.content, ...carried, message]
      : [message];
  const combined = context.join(' ');
  const species = context.map(readConversationSpecies).filter(Boolean).at(-1);
  const weights = [...combined.matchAll(/(\d+(?:[.,]\d+)?)\s*kg\b/gi)];
  const weight = weights.at(-1)?.[1];
  const plan: AiWorkflowPlan = {
    kind,
    species: species === 'cat' ? 'CAT' : species === 'dog' ? 'DOG' : undefined,
  };
  if (weight && Number.isFinite(Number(weight.replace(',', '.'))))
    plan.weightKg = Number(weight.replace(',', '.'));
  if (kind === 'products') {
    plan.category = context
      .map((turn) => productCategory(normalize(turn)))
      .filter(Boolean)
      .at(-1);
    const named = message
      .match(
        /\bmua\s+(?:luôn\s+|luon\s+)?(.+?)(?:\s+(?:nhé|nhe|với|voi|giúp mình|giup minh))?[.!?]*$/iu,
      )?.[1]
      ?.trim();
    if (
      named &&
      !/\b(thuc an|san pham|hat|pate|banh thuong|phu kien|sua tam|cho|meo|be|kg|cai|loai)\b/.test(
        normalize(named),
      )
    )
      plan.search = named;
  }
  if (kind === 'booking') {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const iso = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
    const local = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
    const date =
      iso ??
      (local
        ? `${local[3] || today.slice(0, 4)}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`
        : undefined);
    if (
      date &&
      !Number.isNaN(Date.parse(date)) &&
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date
    )
      plan.date = date;
    else if (/\b(mai|ngay kia|hom nay)\b/.test(normalized)) {
      const offset = normalized.includes('ngay kia')
        ? 2
        : /\bmai\b/.test(normalized)
          ? 1
          : 0;
      plan.date = new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86400000)
        .toISOString()
        .slice(0, 10);
    }
  }
  return plan;
}
