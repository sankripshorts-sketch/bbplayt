/**
 * «Сейчас» для логики броней и статусов ПК: выравниваемся по HTTP `Date` ответов API,
 * чтобы не зависеть от сбитых часов на телефоне. Слоты из API задаются в московском времени и сравниваются
 * как абсолютные моменты (см. parseServerDateTimeString); этот таймер — единственный «сейчас» для брони.
 */

let offsetMs = 0;

/** Не доверять заголовку Date, если он даёт сдвиг часов относительно устройства больше порога (битый кэш/прокси). */
const MAX_TRUSTED_DATE_SKEW_MS = 12 * 60 * 60 * 1000;

/** RFC 7231 `Date` из ответа сервера → смещение (серверный UNIX − локальный Date.now()). */
export function applyHttpDateHeader(header: string | null | undefined): void {
  if (!header?.trim()) return;
  const serverMs = Date.parse(header);
  if (Number.isNaN(serverMs)) return;
  const raw = serverMs - Date.now();
  if (Math.abs(raw) > MAX_TRUSTED_DATE_SKEW_MS) return;
  offsetMs = raw;
}

export function applyServerTimeFromResponse(res: Response): void {
  applyHttpDateHeader(res.headers.get('Date'));
}

/** Текущий момент для сравнения с интервалами брони (серверный, если был заголовок Date). */
export function nowForBookingCompareMs(): number {
  return Date.now() + offsetMs;
}
