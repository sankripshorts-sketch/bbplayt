/** Человекочитаемая длительность для UI брони (без «180 мин»). */

function ruHourWord(n: number): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 'час';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'часа';
  return 'часов';
}

function ruMinuteWord(n: number): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 'минута';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'минуты';
  return 'минут';
}

/**
 * Длительность сессии для подписей колёс и строки «время · длительность».
 * Примеры (ru): «3 часа», «5 часов», «3 часа 30 минут», «45 минут».
 */
export function formatBookingDurationHuman(mins: number, locale: 'ru' | 'en'): string {
  if (!Number.isFinite(mins) || mins <= 0) return '';
  const total = Math.round(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (locale === 'en') {
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
    if (m > 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
    return parts.join(' ');
  }
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${ruHourWord(h)}`);
  if (m > 0) parts.push(`${m} ${ruMinuteWord(m)}`);
  return parts.join(' ');
}
