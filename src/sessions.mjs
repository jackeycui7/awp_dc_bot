// Session manager — per-user conversation context with 24h TTL
const sessions = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 40; // 20 pairs

export function getSession(userId) {
  let s = sessions.get(userId);
  if (!s) {
    s = { messages: [], lastActive: Date.now() };
    sessions.set(userId, s);
  }
  s.lastActive = Date.now();
  return s;
}

export function addMessage(userId, role, content) {
  const s = getSession(userId);
  s.messages.push({ role, content });
  if (s.messages.length > MAX_MESSAGES) {
    s.messages = s.messages.slice(-MAX_MESSAGES);
  }
}

export function getMessages(userId) {
  return getSession(userId).messages;
}

export function clearSession(userId) {
  sessions.delete(userId);
}

// Cleanup expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastActive > SESSION_TTL) sessions.delete(id);
  }
}, 10 * 60 * 1000);

// Per-user request lock to prevent concurrent processing
const locks = new Map();

export async function withUserLock(userId, fn) {
  while (locks.get(userId)) {
    await new Promise(r => setTimeout(r, 200));
  }
  locks.set(userId, true);
  try {
    return await fn();
  } finally {
    locks.delete(userId);
  }
}
