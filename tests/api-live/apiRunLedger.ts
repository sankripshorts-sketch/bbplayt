/**
 * Журнал живого прогона: один сценарий = один тест, внутри — список HTTP-обменов.
 * Итог: консоль + tests/api-live/artifacts/SUITE_SUMMARY.md
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import type { CapturedExchange } from './fetchCapture';
import { SCENARIO_DESCRIPTIONS } from './scenarioDescriptions';

export type HttpCallRow = {
  method: string;
  pathWithQuery: string;
  status: number;
  brief: string;
};

export type ScenarioLedgerRow = {
  slug: string;
  title: string;
  /** Один сценарий = один тест (it); внутри может быть несколько HTTP */
  httpCalls: HttpCallRow[];
  passed: boolean;
  notes: string;
  skipped?: boolean;
};

const rows: ScenarioLedgerRow[] = [];

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

export function ledgerReset(): void {
  rows.length = 0;
}

function exchangesToHttpRows(exchanges: CapturedExchange[]): HttpCallRow[] {
  return exchanges.map((ex) => ({
    method: ex.request.method,
    pathWithQuery: pathOnly(ex.request.url),
    status: ex.response.status,
    brief: briefBody(ex.response.json ?? ex.response.bodyText),
  }));
}

/** После сценария с runCase / ручных запросов. */
export function ledgerRecordScenario(
  slug: string,
  exchanges: CapturedExchange[],
  feedback: { ok: boolean; notes: string }
): void {
  const meta = SCENARIO_DESCRIPTIONS[slug];
  rows.push({
    slug,
    title: meta?.title ?? slug,
    httpCalls: exchangesToHttpRows(exchanges),
    passed: feedback.ok,
    notes: feedback.notes,
  });
}

/** Сценарий без HTTP (например пропущенный topup). */
export function ledgerRecordSkipped(slug: string, reason: string): void {
  const meta = SCENARIO_DESCRIPTIONS[slug];
  rows.push({
    slug,
    title: meta?.title ?? slug,
    httpCalls: [],
    passed: true,
    notes: reason,
    skipped: true,
  });
}

function pad(s: string, n: number): string {
  const t = s.length > n ? s.slice(0, n - 2) + '…' : s;
  return t + ' '.repeat(Math.max(0, n - t.length));
}

/** Печать в stdout и запись MD в artifacts. */
export async function ledgerWriteSummaryFile(): Promise<void> {
  const user = process.env.TEST_USERNAME?.trim() ?? '(нет TEST_USERNAME)';
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '(нет EXPO_PUBLIC_API_BASE_URL)';
  const when = new Date().toISOString();

  const lines: string[] = [];
  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════════════════════╗');
  lines.push('║  ИТОГ ПРОГОНА API (bbplay / tests/api-live)                                   ║');
  lines.push('╚══════════════════════════════════════════════════════════════════════════════╝');
  lines.push(`  Время (UTC): ${when}`);
  lines.push(`  База vibe:    ${base}`);
  lines.push(`  Учётка:       ${user}`);
  lines.push('');

  let pass = 0;
  let fail = 0;
  let skip = 0;
  for (const r of rows) {
    if (r.skipped) skip += 1;
    else if (r.passed) pass += 1;
    else fail += 1;
  }

  lines.push(`  Сценариев: ${rows.length}  (успех: ${pass}, провал: ${fail}, пропуск: ${skip})`);
  lines.push('');
  lines.push('── По каждому сценарию (тесту) ──────────────────────────────────────────────');
  lines.push('');

  for (const r of rows) {
    const st = r.skipped ? 'SKIP' : r.passed ? ' OK ' : 'FAIL';
    lines.push(`  [${st}] ${r.slug}`);
    lines.push(`       ${r.title}`);
    lines.push(`       ${r.notes}`);
    if (r.httpCalls.length === 0) {
      lines.push('       (нет зафиксированных HTTP в этом сценарии)');
    } else {
      r.httpCalls.forEach((h, i) => {
        lines.push(
          `       ${i + 1}. ${pad(h.method, 6)} ${pad(h.pathWithQuery, 72)} → ${h.status}  ${h.brief}`,
        );
      });
    }
    lines.push('');
  }

  lines.push('── Сводная таблица HTTP (все вызовы по порядку) ─────────────────────────────');
  lines.push('');
  let n = 1;
  for (const r of rows) {
    for (const h of r.httpCalls) {
      lines.push(
        `  ${String(n).padStart(3, ' ')}  ${pad(r.slug, 34)}  ${pad(h.method, 6)} ${h.status}  ${h.pathWithQuery}`,
      );
      n += 1;
    }
  }
  lines.push('');
  lines.push('──────────────────────────────────────────────────────────────────────────────');

  const text = lines.join('\n');
  // eslint-disable-next-line no-console
  console.log(text);

  const dir = path.join(__dirname, 'artifacts');
  await fs.mkdir(dir, { recursive: true });
  const mdPath = path.join(dir, 'SUITE_SUMMARY.md');
  const md = [
    '# Сводка прогона API',
    '',
    `- **UTC:** ${when}`,
    `- **EXPO_PUBLIC_API_BASE_URL:** ${base}`,
    `- **TEST_USERNAME:** ${user}`,
    `- **Сценарии:** ${rows.length} (OK: ${pass}, FAIL: ${fail}, SKIP: ${skip})`,
    '',
    '## По сценариям',
    '',
    ...rows.flatMap((r) => {
      const st = r.skipped ? 'SKIP' : r.passed ? 'OK' : 'FAIL';
      const block = [
        `### \`${r.slug}\` — ${st}`,
        '',
        r.notes,
        '',
        '| # | Метод | HTTP | Путь | Кратко |',
        '|---|------|------|------|--------|',
      ];
      if (r.httpCalls.length === 0) {
        block.push('| — | — | — | *(нет запросов)* | — |');
      } else {
        r.httpCalls.forEach((h, i) => {
          const brief = h.brief.replace(/\|/g, '\\|');
          block.push(`| ${i + 1} | ${h.method} | ${h.status} | \`${h.pathWithQuery}\` | ${brief} |`);
        });
      }
      block.push('');
      return block;
    }),
  ].join('\n');

  await fs.writeFile(mdPath, md, 'utf8');
}
