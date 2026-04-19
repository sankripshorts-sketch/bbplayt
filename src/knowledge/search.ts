import type { KnowledgeEntry } from './types';

const STOP = new Set([
  'и',
  'в',
  'во',
  'на',
  'как',
  'что',
  'это',
  'по',
  'из',
  'за',
  'не',
  'а',
  'то',
  'ли',
  'же',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export type RankedKnowledge = { entry: KnowledgeEntry; score: number };

/** Запрос про адрес / «где клуб», без явного вопроса про расписание. */
function asksLocation(q: string): boolean {
  if (
    /(?:куда|кому)\s+(?:написать|писать|обратиться|пожаловаться)|в\s+поддержк|оператор|жалоба/u.test(q)
  ) {
    return false;
  }
  const t = q.trim();
  if (/^\s*где\s*[?!.,]*\s*$/u.test(t)) return true;
  return (
    /(?:^|[\s,.;!?])(?:где|куда)\s+(?:находятся|находится|клуб|клубы|филиал|филиалы|точк|ближайш)/u.test(
      q,
    ) ||
    /\bадрес/u.test(q) ||
    /расположен|расположены/u.test(q) ||
    /как\s+(?:доехать|добраться|проехать)/u.test(q) ||
    /(?:на\s+карте|карта\s+клуб|схема\s+проезда)/u.test(q) ||
    /(?:ближайш|ближайший|рядом)\s+.{0,24}клуб/u.test(q)
  );
}

/** Явный вопрос про часы / график (чтобы не путать с «где клуб»). */
function asksSchedule(q: string): boolean {
  return /(?:во|в)\s+сколько|в\s+какое\s+время|когда\s+(?:вы\s+)?(?:открыва|закрыва|работ)|до\s+скольки|график|режим\s+работ|часы\s+работ|открываете|закрываете|выходной|круглосуточно/u.test(
    q,
  );
}

/** Типовые формулировки, которые иначе промахиваются по ключам или цепляются не к той карточке. */
function intentBonus(q: string, e: KnowledgeEntry): number {
  const id = e.id;
  let b = 0;

  const loc = asksLocation(q);
  const sched = asksSchedule(q);

  if (id === 'club-locations' && loc) {
    b += 28;
  }

  if (
    id === 'club-hours' &&
    /(?:во|в)\s+сколько|в\s+какое\s+время|когда\s+(?:вы\s+)?(?:открыва|закрыва)|до\s+скольки(?:\s+работ)?|график\s+работы|режим\s+работы|часы\s+работы|во\s+скольки/u.test(
      q,
    )
  ) {
    b += 22;
  }

  if (id === 'club-hours' && loc && !sched) {
    b -= 20;
  }

  if (
    id === 'equipment-pc-specs' &&
    /какие\s+(?:комп|компы|компьютеры)|что\s+в\s+пк|что\s+стоит\s+в\s+пк|что\s+за\s+пк|что\s+у\s+пк|характеристик|железо|видеокарт|процессор|rtx|гц|герцовк/u.test(
      q,
    )
  ) {
    b += 20;
  }

  if (
    id === 'booking-free-seats-zones' &&
    /какие\s+(?:комп|компы)|характеристик|видеокарт|процессор|железо|что\s+в\s+пк|что\s+стоит\s+в\s+пк/u.test(q)
  ) {
    b -= 14;
  }

  if (
    id === 'payment-rates-timeofday' &&
    /(?:сколько\s+стоит|тариф|почас|ночн|пакет|руб|₽|цена|стоимост)|\d+\s*(?:руб|₽)/u.test(q)
  ) {
    b += 12;
  }

  return b;
}

/**
 * Скоринг: целые фразы ключей в запросе (без подстрочных ложных совпадений вроде «во» в «своя»),
 * плюс слабое пересечение с текстом карточки и intent-подсказки.
 */
function scoreEntry(query: string, qTokens: string[], e: KnowledgeEntry): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const questionLower = e.question.toLowerCase();
  const hayFull = `${e.question} ${e.keywords.join(' ')}`.toLowerCase();

  let score = 0;
  if (questionLower.includes(q)) score += 25;
  else if (hayFull.includes(q)) score += 12;

  for (const k of e.keywords) {
    const kk = k.toLowerCase().trim();
    if (kk.length < 2) continue;
    if (q.includes(kk)) score += 5;
  }

  for (const t of qTokens) {
    if (t.length < 4) continue;
    if (questionLower.includes(t)) score += 3;
  }

  score += intentBonus(q, e);

  return Math.max(0, score);
}

export function rankKnowledge(query: string, entries: KnowledgeEntry[]): RankedKnowledge[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const qTokens = tokenize(q);
  return entries
    .map((e) => ({ entry: e, score: scoreEntry(q, qTokens, e) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Один лучший матч для ответа в чате (без склейки всех совпадений). */
export function bestKnowledgeEntry(query: string, entries: KnowledgeEntry[]): KnowledgeEntry | null {
  const ranked = rankKnowledge(query, entries);
  if (ranked.length === 0) return null;
  const top = ranked[0].score;
  const ties = ranked.filter((x) => x.score === top);
  if (ties.length === 1) return ties[0].entry;
  const q = query.trim().toLowerCase();
  if (asksLocation(q)) {
    const loc = ties.find((x) => x.entry.id === 'club-locations');
    if (loc) return loc.entry;
  }
  return ties[0].entry;
}

export function searchKnowledge(query: string, entries: KnowledgeEntry[]): KnowledgeEntry[] {
  return rankKnowledge(query, entries).map((x) => x.entry);
}
