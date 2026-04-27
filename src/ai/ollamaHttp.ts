/**
 * Ollama Cloud (fetch) с таймаутом: на мобильных сети запрос без лимита может «висеть» долго.
 */
export const OLLAMA_RAG_TIMEOUT_MS = 90_000;
export const OLLAMA_EXTRACT_TIMEOUT_MS = 25_000;

const OLLAMA_RETRY_ATTEMPTS = 3;
const OLLAMA_RETRY_BASE_DELAY_MS = 450;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isLikelyTransientFetchFailure(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  if (e instanceof Error) {
    const m = e.message.toLowerCase();
    if (m.includes('network request failed')) return true;
    if (m.includes('failed to fetch')) return true;
    if (m.includes('load failed')) return true;
  }
  return false;
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

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

/**
 * Повтор при обрыве сети и 5xx/429 на мобильных — снижает «то отвечает, то нет».
 * Таймаут (AbortError) не дублируем: второй такой же запрос только удлинит ожидание.
 */
export async function ollamaFetchWithRetry(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? OLLAMA_RETRY_ATTEMPTS;
  const baseDelayMs = options?.baseDelayMs ?? OLLAMA_RETRY_BASE_DELAY_MS;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await ollamaFetch(input, init, timeoutMs);
      if (res.ok) return res;
      if (attempt < maxAttempts - 1 && isRetryableHttpStatus(res.status)) {
        await sleep(baseDelayMs * (attempt + 1));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (isAbortError(e)) throw e;
      if (attempt < maxAttempts - 1 && isLikelyTransientFetchFailure(e)) {
        await sleep(baseDelayMs * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Ollama fetch failed');
}

export function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}
