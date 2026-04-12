/**
 * Сервер iCafe оперирует московским временем (Europe/Moscow, UTC+3 без DST с 2014 г.).
 * Строки без таймзоны из API интерпретируем как московские «настенные» часы.
 */

export const SERVER_TIME_ZONE = 'Europe/Moscow';

/** Московское локальное время → абсолютный момент (Date). */
export function moscowWallTimeToUtc(
  y: number,
  mo: number,
  d: number,
  hh: number,
  mm: number,
  ss: number,
): Date {
  const ms = Date.UTC(y, mo - 1, d, hh, mm, ss) - 3 * 60 * 60 * 1000;
  return new Date(ms);
}

function pad2(n: string): string {
  return n.length >= 2 ? n : n.padStart(2, '0');
}

/** Абсолютный момент → дата и время на часах в Москве (для полей API). */
/** Время на часах в Москве для UI (без сдвига в локальный пояс устройства). */
export function formatInstantMoscowWallForLocale(d: Date, locale: 'ru' | 'en'): string {
  if (locale === 'ru') {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: SERVER_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: SERVER_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/** Календарная дата YYYY-MM-DD для момента `d` по часам Москвы. */
export function formatISODateMoscow(d: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: SERVER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const pick = (t: Intl.DateTimeFormatPart['type']) => parts.find((p) => p.type === t)?.value ?? '';
  const y = pick('year');
  const mo = pick('month');
  const da = pick('day');
  if (!y || !mo || !da) return '';
  return `${y}-${mo}-${da}`;
}

/** Сдвиг календарного дня YYYY-MM-DD в смысле московских часов. */
export function addCalendarDaysMoscow(dayISO: string, deltaDays: number): string {
  const [y, mo, d] = dayISO.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return dayISO;
  const noon = moscowWallTimeToUtc(y, mo, d, 12, 0, 0);
  const shifted = new Date(noon.getTime() + deltaDays * 864e5);
  return formatISODateMoscow(shifted);
}

/** Минуты от полуночи по часам Москвы для момента `d` (абсолютное время). */
export function moscowWallTotalMinutesFromInstant(d: Date): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: SERVER_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function formatHHmmMoscow(d: Date): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: SERVER_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h}:${m}`;
}

/** Отображение календарного дня YYYY-MM-DD как даты в Москве (для списков и заголовков). */
export function formatMoscowCalendarDayLong(iso: string, locale: string): string {
  const [y, mo, d] = iso.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return iso;
  const instant = moscowWallTimeToUtc(y, mo, d, 12, 0, 0);
  return instant.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: SERVER_TIME_ZONE,
  });
}

export function formatMoscowCalendarDayShort(iso: string, locale: string): string {
  const [y, mo, d] = iso.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return iso;
  const instant = moscowWallTimeToUtc(y, mo, d, 12, 0, 0);
  return instant.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: SERVER_TIME_ZONE,
  });
}

export function formatInstantInMoscow(d: Date): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: SERVER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const pick = (t: Intl.DateTimeFormatPart['type']) => parts.find((p) => p.type === t)?.value ?? '';
  const y = pick('year');
  const mo = pad2(pick('month'));
  const da = pad2(pick('day'));
  const h = pad2(pick('hour'));
  const m = pad2(pick('minute'));
  const s = pad2(pick('second'));
  /** iCafe API ожидает `start_time` как `HH:mm:ss` (см. официальную документацию). */
  return { date: `${y}-${mo}-${da}`, time: `${h}:${m}:${s}` };
}

function hasExplicitTimeZoneOffset(s: string): boolean {
  const t = s.trim();
  return /[zZ]$/.test(t) || /[+-]\d{2}:\d{2}$/.test(t) || /[+-]\d{4}$/.test(t);
}

/**
 * Парсит строки из API в абсолютный момент.
 * Naive YYYY-MM-DD / DD.MM.YYYY + время — как Europe/Moscow.
 * ISO с Z или смещением — как обычный Date.parse.
 */
export function parseServerDateTimeString(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  if (hasExplicitTimeZoneOffset(s)) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : new Date(t);
  }

  const dmYhm = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (dmYhm) {
    const d = Number(dmYhm[1]);
    const mo = Number(dmYhm[2]);
    const y = Number(dmYhm[3]);
    const hh = Number(dmYhm[4]);
    const mm = Number(dmYhm[5]);
    const ss = dmYhm[6] != null ? Number(dmYhm[6]) : 0;
    return moscowWallTimeToUtc(y, mo, d, hh, mm, ss);
  }

  const ymdhm = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (ymdhm) {
    const y = Number(ymdhm[1]);
    const mo = Number(ymdhm[2]);
    const d = Number(ymdhm[3]);
    const hh = Number(ymdhm[4]);
    const mm = Number(ymdhm[5]);
    const ss = ymdhm[6] != null ? Number(ymdhm[6]) : 0;
    return moscowWallTimeToUtc(y, mo, d, hh, mm, ss);
  }

  const isoTry = Date.parse(s);
  if (!Number.isNaN(isoTry)) return new Date(isoTry);

  return null;
}
