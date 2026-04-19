import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bestKnowledgeEntry } from '@/knowledge/search';
import type { KnowledgeEntry } from '@/knowledge/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entries = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../assets/knowledge.json'), 'utf8'),
) as KnowledgeEntry[];

describe('bestKnowledgeEntry', () => {
  it('maps location-style questions to club-locations, not club-hours', () => {
    const queries = [
      'где клуб',
      'где находятся клубы',
      'адрес клуба',
      'как добраться до клуба',
      'на карте где вы',
    ];
    for (const q of queries) {
      expect(bestKnowledgeEntry(q, entries)?.id, q).toBe('club-locations');
    }
  });

  it('keeps schedule questions on club-hours', () => {
    const queries = ['какой график работы', 'во сколько открываетесь', 'до скольки работаете'];
    for (const q of queries) {
      expect(bestKnowledgeEntry(q, entries)?.id, q).toBe('club-hours');
    }
  });

  it('does not treat «куда написать в поддержку» as a clubs address query', () => {
    const hit = bestKnowledgeEntry('куда написать в поддержку', entries);
    expect(hit?.id).toBe('support-where');
  });
});
