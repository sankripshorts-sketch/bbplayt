export type CapturedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

export type CapturedResponse = {
  status: number;
  /** Сырой текст; при JSON ниже дублируется в `json` */
  bodyText: string;
  json?: unknown;
};

export type CapturedExchange = {
  request: CapturedRequest;
  response: CapturedResponse;
};

let originalFetch: typeof fetch;
const chain: CapturedExchange[] = [];

function safeHeaders(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  if (h instanceof Headers) {
    h.forEach((v: string, k: string) => {
      const low = k.toLowerCase();
      out[k] = low === 'authorization' || low === 'cookie' ? '[REDACTED]' : v;
    });
    return out;
  }
  if (Array.isArray(h)) {
    for (const [k, v] of h) {
      const low = k.toLowerCase();
      out[k] = low === 'authorization' || low === 'cookie' ? '[REDACTED]' : String(v);
    }
    return out;
  }
  for (const [k, v] of Object.entries(h)) {
    const low = k.toLowerCase();
    out[k] = low === 'authorization' || low === 'cookie' ? '[REDACTED]' : String(v);
  }
  return out;
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }
  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries());
  }
  return '[binary or unsupported body]';
}

function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function installFetchCapture(): void {
  originalFetch = globalThis.fetch.bind(globalThis);
  chain.length = 0;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url: string;
    if (typeof input === 'string') url = input;
    else if (input instanceof URL) url = input.href;
    else url = input.url;

    const method = init?.method ?? 'GET';
    const headers = safeHeaders(init?.headers);
    const body = parseBody(init?.body as BodyInit | undefined);

    const res = await originalFetch(input, init);
    const bodyText = await res.clone().text();
    const json = tryParseJson(bodyText);

    chain.push({
      request: { url, method, headers, body },
      response: { status: res.status, bodyText, json },
    });
    return res;
  };
}

export function uninstallFetchCapture(): void {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
}

export function getCaptures(): CapturedExchange[] {
  return [...chain];
}

export function clearCaptures(): void {
  chain.length = 0;
}
