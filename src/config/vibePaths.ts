import Constants from 'expo-constants';

/** По API_VIBE — `/all-books-cafes`; при необходимости переопределите env. */
const DEFAULT_ALL_BOOKS = '/all-books-cafes';

/**
 * GET vibe: список броней по клубам.
 * Дефолт `/all-books-cafes`; альтернатива `/all-books-member` (тот же query `memberAccount`).
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
