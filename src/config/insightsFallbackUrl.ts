/**
 * Если прокси не отдаёт iCafe-методы (403 / «api not allowed»), можно задать страницу ЛК/статистики
 * в браузере — кнопка появится под текстом ошибки.
 * EXPO_PUBLIC_INSIGHTS_FALLBACK_URL=https://...
 */
export function getInsightsFallbackUrl(): string | undefined {
  const u = process.env.EXPO_PUBLIC_INSIGHTS_FALLBACK_URL?.trim();
  if (u && /^https?:\/\//i.test(u)) return u;
  return undefined;
}
