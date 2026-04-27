/**
 * Ollama Cloud (fetch) с таймаутом: на мобильных сети запрос без лимита может «висеть» долго.
 */
export const OLLAMA_RAG_TIMEOUT_MS = 90_000;
export const OLLAMA_EXTRACT_TIMEOUT_MS = 25_000;

export async function ollamaFetch(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

export function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}
