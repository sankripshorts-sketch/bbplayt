import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const STORAGE_KEY = 'bbplay.knowledgeChatFeedback.v1';
const MAX_EVENTS = 500;

export type KnowledgeChatHelpfulness = 'up' | 'down';

/**
 * Событие оценки ответа бота. Хранится локально; поле `synced` — для последующей отправки на ваш сервер.
 */
export type KnowledgeChatFeedbackEvent = {
  id: string;
  /** ISO, обновляется при смене голоса, пока запись ещё не синхронизирована */
  createdAt: string;
  appVersion: string | null;
  locale: string;
  /** id баббла в UI (см. `Msg.id` в KnowledgeChatScreen) */
  messageId: string;
  userQuery: string;
  botReply: string;
  helpful: KnowledgeChatHelpfulness;
  synced: boolean;
};

function getAppVersion(): string | null {
  const v = Constants.expoConfig?.version;
  return typeof v === 'string' && v.length ? v : null;
}

function makeId(): string {
  return `kcf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function trimQueue(list: KnowledgeChatFeedbackEvent[]): KnowledgeChatFeedbackEvent[] {
  if (list.length <= MAX_EVENTS) return list;
  return list.slice(list.length - MAX_EVENTS);
}

export async function loadKnowledgeChatFeedbackQueue(): Promise<KnowledgeChatFeedbackEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: KnowledgeChatFeedbackEvent[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== 'object') continue;
      const o = x as Record<string, unknown>;
      if (
        typeof o.id === 'string' &&
        typeof o.createdAt === 'string' &&
        (o.appVersion === null || typeof o.appVersion === 'string') &&
        typeof o.locale === 'string' &&
        typeof o.messageId === 'string' &&
        typeof o.userQuery === 'string' &&
        typeof o.botReply === 'string' &&
        (o.helpful === 'up' || o.helpful === 'down') &&
        typeof o.synced === 'boolean'
      ) {
        out.push({
          id: o.id,
          createdAt: o.createdAt,
          appVersion: o.appVersion,
          locale: o.locale,
          messageId: o.messageId,
          userQuery: o.userQuery,
          botReply: o.botReply,
          helpful: o.helpful,
          synced: o.synced,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function saveQueue(list: KnowledgeChatFeedbackEvent[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Сохраняет или обновляет несинхронизированное событие с тем же `messageId` (смена лайк/дизлайк).
 */
export async function upsertPendingKnowledgeChatFeedback(args: {
  messageId: string;
  userQuery: string;
  botReply: string;
  helpful: KnowledgeChatHelpfulness;
  locale: string;
}): Promise<void> {
  const { messageId, userQuery, botReply, helpful, locale } = args;
  const queue = await loadKnowledgeChatFeedbackQueue();
  const now = new Date().toISOString();
  const appVersion = getAppVersion();
  const idx = queue.findIndex((e) => e.messageId === messageId && !e.synced);
  if (idx >= 0) {
    const cur = queue[idx]!;
    queue[idx] = {
      ...cur,
      createdAt: now,
      userQuery,
      botReply,
      helpful,
      locale,
      appVersion: appVersion ?? cur.appVersion,
    };
  } else {
    queue.push({
      id: makeId(),
      createdAt: now,
      appVersion,
      locale,
      messageId,
      userQuery,
      botReply,
      helpful,
      synced: false,
    });
  }
  await saveQueue(trimQueue(queue));
}

/** Для фоновой/ручной отправки на сервер */
export async function getUnsyncedKnowledgeChatFeedback(): Promise<KnowledgeChatFeedbackEvent[]> {
  const q = await loadKnowledgeChatFeedbackQueue();
  return q.filter((e) => !e.synced);
}

export async function markKnowledgeChatFeedbackSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const set = new Set(ids);
  const queue = await loadKnowledgeChatFeedbackQueue();
  let changed = false;
  for (const e of queue) {
    if (set.has(e.id) && !e.synced) {
      e.synced = true;
      changed = true;
    }
  }
  if (changed) await saveQueue(queue);
}

export function getPrecedingUserText(
  list: { id: string; role: 'user' | 'bot'; text: string }[],
  botMessageId: string,
): string {
  const idx = list.findIndex((m) => m.id === botMessageId);
  if (idx <= 0) return '';
  for (let i = idx - 1; i >= 0; i -= 1) {
    const m = list[i]!;
    if (m.role === 'user') return m.text;
  }
  return '';
}
