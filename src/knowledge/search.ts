import type { KnowledgeEntry } from './types';

const STOP = new Set([
  'и',
  'в',
  'на',
  'как',
  'что',
  'это',
  'по',
  'из',
  'за',
  'не',
  'а',
  'то',
  'ли',
  'же',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function searchKnowledge(query: string, entries: KnowledgeEntry[]): KnowledgeEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const qTokens = tokenize(q);
  const scored = entries.map((e) => {
    let score = 0;
    const hay = `${e.question} ${e.answer} ${e.keywords.join(' ')}`.toLowerCase();
    if (hay.includes(q)) score += 10;
    for (const t of qTokens) {
      if (e.keywords.some((k) => k.includes(t) || t.includes(k))) score += 4;
      if (e.question.toLowerCase().includes(t)) score += 3;
      if (e.answer.toLowerCase().includes(t)) score += 1;
    }
    return { e, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);
}
