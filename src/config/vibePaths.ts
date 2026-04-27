import Constants from 'expo-constants';

/** Для «Мои брони» по умолчанию используем member endpoint, чтобы сервер отдавал историю пользователя. */
const DEFAULT_ALL_BOOKS = '/all-books-member';

/**
 * GET vibe: список броней пользователя по клубам.
 * Дефолт `/all-books-member`; альтернатива `/all-books-cafes` (тот же query `memberAccount`).
 * Задаётся `EXPO_PUBLIC_ALL_BOOKS_PATH` или `app.config.js` → `extra.allBooksPath`.
 */
export function getAllBooksPath(): string {
  const fromEnv = process.env.EXPO_PUBLIC_ALL_BOOKS_PATH?.trim();
  if (fromEnv?.length) {
    return fromEnv.startsWith('/') ? fromEnv : `/${fromEnv}`;
  }
  const extra = Constants.expoConfig?.extra as { allBooksPath?: string } | undefined;
  const p = extra?.allBooksPath?.trim();
  if (p?.length) {
    return p.startsWith('/') ? p : `/${p}`;
  }
  return DEFAULT_ALL_BOOKS;
}
