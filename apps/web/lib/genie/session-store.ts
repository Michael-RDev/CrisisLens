const SESSION_TTL_MS = 1000 * 60 * 60 * 6;
const MAX_SESSIONS = 500;

type SessionEntry = {
  conversationId: string;
  updatedAt: number;
};

const conversationBySession = new Map<string, SessionEntry>();

function evictOldestIfNeeded() {
  if (conversationBySession.size < MAX_SESSIONS) return;
  let oldestKey: string | null = null;
  let oldestTime = Number.POSITIVE_INFINITY;

  for (const [key, value] of conversationBySession.entries()) {
    if (value.updatedAt < oldestTime) {
      oldestTime = value.updatedAt;
      oldestKey = key;
    }
  }

  if (oldestKey) conversationBySession.delete(oldestKey);
}

function pruneExpired(now = Date.now()) {
  for (const [key, value] of conversationBySession.entries()) {
    if (now - value.updatedAt > SESSION_TTL_MS) {
      conversationBySession.delete(key);
    }
  }
}

export function getConversationForSession(sessionId: string): string | null {
  pruneExpired();
  const current = conversationBySession.get(sessionId);
  if (!current) return null;
  current.updatedAt = Date.now();
  conversationBySession.set(sessionId, current);
  return current.conversationId;
}

export function setConversationForSession(sessionId: string, conversationId: string): void {
  pruneExpired();
  evictOldestIfNeeded();
  conversationBySession.set(sessionId, {
    conversationId,
    updatedAt: Date.now()
  });
}
