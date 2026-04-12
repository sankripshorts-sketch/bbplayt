import fs from 'node:fs/promises';
import path from 'node:path';
import type { CapturedExchange } from './fetchCapture';

const ARTIFACTS_ROOT = path.join(__dirname, 'artifacts');

function serializeRequests(exchanges: CapturedExchange[]) {
  return {
    exchanges: exchanges.map((e) => e.request),
  };
}

function serializeResponses(exchanges: CapturedExchange[]) {
  return {
    exchanges: exchanges.map((e) => ({
      status: e.response.status,
      body: e.response.json !== undefined ? e.response.json : e.response.bodyText,
    })),
  };
}

function serializeReturnedValue(value: unknown): unknown {
  if (value === undefined) return { note: 'функция не вернула данных (void)' };
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return String(value);
  }
}

export async function writeApiArtifact(
  slug: string,
  exchanges: CapturedExchange[],
  returned: unknown,
  error: Error | null,
  feedback: { ok: boolean; notes: string }
): Promise<void> {
  const dir = path.join(ARTIFACTS_ROOT, slug);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(
    path.join(dir, '01-request.json'),
    JSON.stringify(serializeRequests(exchanges), null, 2),
    'utf8'
  );

  const responseFile = {
    http: serializeResponses(exchanges),
    parsedReturn: error ? { error: error.message } : serializeReturnedValue(returned),
  };

  await fs.writeFile(path.join(dir, '02-response.json'), JSON.stringify(responseFile, null, 2), 'utf8');

  const statusRu = feedback.ok ? 'работает' : 'не работает';
  const md = [
    '# Результат проверки API',
    '',
    `**Статус:** ${statusRu}`,
    '',
    '## Комментарий',
    '',
    feedback.notes,
    '',
  ].join('\n');

  await fs.writeFile(path.join(dir, '03-feedback.md'), md, 'utf8');
}
