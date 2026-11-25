function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function requestFingerprint(payload: unknown): string {
  const input = JSON.stringify(stableValue(payload));
  let first = 2166136261;
  let second = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 2246822519);
  }
  return `${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}

function newRequestKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `pc-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

interface StoredRequestKey {
  fingerprint: string;
  key: string;
  createdAt: number;
}

const REQUEST_KEY_TTL_MS = 24 * 60 * 60 * 1000;
const inMemoryRequestKeys = new Map<string, Map<string, StoredRequestKey>>();

function isFreshRequestKey(value: unknown, now: number): value is StoredRequestKey {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<StoredRequestKey>;
  return typeof entry.fingerprint === "string"
    && typeof entry.key === "string"
    && typeof entry.createdAt === "number"
    && now - entry.createdAt < REQUEST_KEY_TTL_MS;
}

function readRequestKeys(storageKey: string, now: number): Map<string, StoredRequestKey> {
  const entries = new Map<string, StoredRequestKey>();
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return entries;

    const parsed = JSON.parse(stored) as {
      requests?: Record<string, unknown>;
      fingerprint?: string;
      key?: string;
      createdAt?: number;
    };
    if (parsed.requests && typeof parsed.requests === "object" && !Array.isArray(parsed.requests)) {
      for (const candidate of Object.values(parsed.requests)) {
        if (isFreshRequestKey(candidate, now)) entries.set(candidate.fingerprint, candidate);
      }
      return entries;
    }

    // Migrate the previous single-request storage shape without breaking retries already in flight.
    if (isFreshRequestKey(parsed, now)) entries.set(parsed.fingerprint, parsed);
  } catch {
    // Invalid or unavailable storage falls back to the in-memory request map.
  }
  return entries;
}

function persistRequestKeys(storageKey: string, entries: Map<string, StoredRequestKey>): void {
  try {
    if (entries.size === 0) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, JSON.stringify({ requests: Object.fromEntries(entries) }));
  } catch {
    // Storage failure must not prevent the operation or discard the in-memory retry key.
  }
}

export function getIdempotencyKey(scope: string, payload: unknown): string {
  const fingerprint = requestFingerprint(payload);
  if (typeof window === "undefined") return newRequestKey();

  const storageKey = `petcare:idempotency:${scope}`;
  const now = Date.now();
  const storedEntries = readRequestKeys(storageKey, now);
  const memoryEntries = inMemoryRequestKeys.get(storageKey) ?? new Map<string, StoredRequestKey>();
  for (const [entryFingerprint, entry] of memoryEntries) {
    if (isFreshRequestKey(entry, now) && !storedEntries.has(entryFingerprint)) {
      storedEntries.set(entryFingerprint, entry);
    }
  }

  const existing = storedEntries.get(fingerprint);
  if (existing) {
    inMemoryRequestKeys.set(storageKey, storedEntries);
    persistRequestKeys(storageKey, storedEntries);
    return existing.key;
  }

  const entry = { fingerprint, key: newRequestKey(), createdAt: now };
  storedEntries.set(fingerprint, entry);
  inMemoryRequestKeys.set(storageKey, storedEntries);
  persistRequestKeys(storageKey, storedEntries);
  return entry.key;
}

export function clearIdempotencyKey(scope: string, payload: unknown): void {
  if (typeof window === "undefined") return;
  const storageKey = `petcare:idempotency:${scope}`;
  const fingerprint = requestFingerprint(payload);
  const entries = readRequestKeys(storageKey, Date.now());
  const memoryEntries = inMemoryRequestKeys.get(storageKey);
  memoryEntries?.delete(fingerprint);
  entries.delete(fingerprint);

  if (memoryEntries?.size === 0) inMemoryRequestKeys.delete(storageKey);
  else if (memoryEntries) {
    for (const [entryFingerprint, entry] of memoryEntries) {
      if (!isFreshRequestKey(entry, Date.now())) memoryEntries.delete(entryFingerprint);
      else if (!entries.has(entryFingerprint)) entries.set(entryFingerprint, entry);
    }
  }

  persistRequestKeys(storageKey, entries);
}
