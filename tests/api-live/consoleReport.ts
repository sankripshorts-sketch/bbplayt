import type { CapturedExchange } from './fetchCapture';
import { SCENARIO_DESCRIPTIONS } from './scenarioDescriptions';

function pathOnly(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function briefBody(json: unknown): string {
  if (json === undefined || json === null) return '(пусто)';
  if (typeof json !== 'object') return String(json).slice(0, 160);
  const o = json as Record<string, unknown>;
  if (typeof o.message === 'string') return o.message;
  if (typeof o.error === 'string') return o.error;
  if (typeof o.code === 'number' && typeof o.message === 'string') {
    return `code=${o.code} ${o.message}`;
  }
  const data = o.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (typeof d.message === 'string') return d.message;
  }
  if (Array.isArray(o.members)) return `members: ${o.members.length} записей`;
  if (o.data !== undefined && typeof o.data === 'object') return 'data: {...}';
  return JSON.stringify(json).slice(0, 200);
}

/**
 * Печать в консоль после каждого сценария: подпись + каждый HTTP-обмен с кратким итогом ответа.
 */
export function printScenarioReport(
  slug: string,
  exchanges: CapturedExchange[],
  error: Error | null,
  feedback: { ok: boolean; notes: string }
): void {
  const meta = SCENARIO_DESCRIPTIONS[slug] ?? {
    title: slug,
    purpose: '(описание не добавлено в scenarioDescriptions.ts)',
  };
  const lines: string[] = [];
  lines.push('');
  lines.push('══════════════════════════════════════════════════════════════');
  lines.push(`▶ ${meta.title}  [${slug}]`);
  lines.push(`  ${meta.purpose}`);
  lines.push('──────────────────────────────────────────────────────────────');
  if (exchanges.length === 0) {
    lines.push('  (нет HTTP-запросов в этом сценарии — возможно только локальная логика)');
  }
  exchanges.forEach((ex, i) => {
    const { request, response } = ex;
    const path = pathOnly(request.url);
    const summary = briefBody(response.json ?? response.bodyText);
    lines.push(`  [${i + 1}] ${request.method.padEnd(6)} ${path}`);
    lines.push(`       → HTTP ${response.status}  ${summary}`);
  });
  lines.push('──────────────────────────────────────────────────────────────');
  lines.push(`  Итог сценария: ${feedback.ok ? 'OK' : 'ОШИБКА'}`);
  if (error) {
    lines.push(`  Исключение: ${error.message}`);
  }
  lines.push(`  Комментарий: ${feedback.notes}`);
  lines.push('══════════════════════════════════════════════════════════════');
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}
