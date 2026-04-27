import { getOllamaConfig } from '../config/ollamaConfig';
import { isAbortError, ollamaFetch, OLLAMA_EXTRACT_TIMEOUT_MS } from './ollamaHttp';

const CHAT_PATH = '/chat';

export type BookingLlmExtraction = {
  /** YYYY-MM-DD, Московский день, если в тексте явно/по смыслу */
  dateISO: string | null;
  /** HH:mm 24h */
  hhmm: string | null;
  duration_mins: number | null;
  /** Как место/ПК, например "9" -> PC 9 */
  pc_seat: string | null;
  /** Фрагмент про клуб — адрес, название, город */
  club_hint: string | null;
};

const EMPTY: BookingLlmExtraction = {
  dateISO: null,
  hhmm: null,
  duration_mins: null,
  pc_seat: null,
  club_hint: null,
};

type ChatJson = { message?: { content?: string } };

function tryParseExtraction(s: string): Partial<BookingLlmExtraction> | null {
  const t = s.replace(/\r/g, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const o = JSON.parse(t.slice(a, b + 1)) as Record<string, unknown>;
    const g = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : null);
    const n = (k: string) => (typeof o[k] === 'number' && Number.isFinite(o[k] as number) ? (o[k] as number) : null);
    return {
      dateISO: g('dateISO')?.trim() || g('date_iso') || null,
      hhmm: g('hhmm')?.trim() || g('time_24h') || null,
      duration_mins: n('duration_mins') ?? n('durationMins'),
      pc_seat: g('pc_seat')?.trim() || g('pc') || null,
      club_hint: g('club_hint')?.trim() || g('club') || null,
    };
  } catch {
    return null;
  }
}

/**
 * Нормализует свободный текст брони в JSON полей, чтобы дальше к ним применилась детерминированная логика приложения.
 */
export async function extractBookingWithOllama(
  userText: string,
  locale: string,
  /** Сегодня YYYY-MM-DD (Мск), для относительных дат */
  todayISO: string,
): Promise<BookingLlmExtraction> {
  const { baseUrl, model, apiKey } = getOllamaConfig();
  if (!apiKey) return { ...EMPTY };

  const isRu = !locale.startsWith('en');
  const system = isRu
    ? 'Ты парсер интентов брони ПК. Ответь СТРОГО одним JSON-объектом, без markdown и без пояснений. Поля: dateISO (string|null) формат YYYY-MM-DD, hhmm (string|null) формат HH:mm 24h, duration_mins (number|null) сколько минут, pc_seat (string|null) только номер/имя места (например "9" если пользователь писал "9 пк"), club_hint (string|null) кусок про клуб если есть. Сегодняшняя дата: ' +
      todayISO +
      '. Если в тексте "завтра" — +1 день. Если время "21 50" — hhmm "21:50". "1 час" — 60. Час без "утра/ночи" в 12-часовой форме считай дневным: "в три", "в 3" → 15:00; только с "утра", "ночи", "ночью" и т.п. → ночь: "в 3 ночи" → 03:00. "в 09:00" или "в 03" с ведущим нулём — как записано. Не копируй несвязанные цифры: номер ПК в конце фразы "9 пк" — это ПК, не время. Если нет — null.'
    : 'You extract booking fields. Reply with ONE JSON object only, no markdown. Fields: dateISO, hhmm (HH:mm 24h), duration_mins, pc_seat, club_hint. Today is ' +
      todayISO +
      '. 1h = 60. PC number in "9 pc" is seat 9, not time.';

  const url = `${baseUrl.replace(/\/$/, '')}${CHAT_PATH}`;
  let res: Response;
  try {
    res = await ollamaFetch(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: `Текст:\n${userText}` },
          ],
          options: { temperature: 0.1, top_p: 0.5 },
        }),
      },
      OLLAMA_EXTRACT_TIMEOUT_MS,
    );
  } catch (e) {
    if (__DEV__ && e instanceof Error && !isAbortError(e)) {
      console.warn('[ollama-extract]', e.message);
    }
    return { ...EMPTY };
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama extract HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as ChatJson;
  const raw = data.message?.content?.trim();
  if (!raw) return { ...EMPTY };
  const parsed = tryParseExtraction(raw);
  if (!parsed) return { ...EMPTY };
  return {
    dateISO: parsed.dateISO ?? null,
    hhmm: parsed.hhmm ? normalizeHhmm(parsed.hhmm) : null,
    duration_mins:
      typeof parsed.duration_mins === 'number' && Number.isFinite(parsed.duration_mins)
        ? Math.round(parsed.duration_mins)
        : null,
    pc_seat: parsed.pc_seat?.trim() || null,
    club_hint: parsed.club_hint?.trim() || null,
  };
}

function normalizeHhmm(s: string): string {
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return s;
  return `${m[1]!.padStart(2, '0')}:${m[2]}`;
}

