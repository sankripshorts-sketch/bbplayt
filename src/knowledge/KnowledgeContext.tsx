import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import bundled from '../../assets/knowledge.json';
import { getKnowledgeJsonUrl } from '../config/knowledgeUrl';
import type { KnowledgeCategory, KnowledgeEntry } from './types';
import { isKnowledgeCategory } from './types';

const DEFAULT_CATEGORY: KnowledgeCategory = 'club';

function parseEntry(item: unknown): KnowledgeEntry | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.question !== 'string' || typeof o.answer !== 'string') {
    return null;
  }
  if (!Array.isArray(o.keywords) || !o.keywords.every((k) => typeof k === 'string')) {
    return null;
  }
  let category: KnowledgeCategory = DEFAULT_CATEGORY;
  if (typeof o.category === 'string' && isKnowledgeCategory(o.category)) {
    category = o.category;
  }
  return {
    id: o.id,
    category,
    question: o.question,
    answer: o.answer,
    keywords: o.keywords,
  };
}

function parseKnowledgeJson(json: unknown): KnowledgeEntry[] | null {
  if (!Array.isArray(json)) return null;
  const out: KnowledgeEntry[] = [];
  for (const item of json) {
    const e = parseEntry(item);
    if (!e) return null;
    out.push(e);
  }
  return out.length > 0 ? out : null;
}

type KnowledgeContextValue = {
  entries: KnowledgeEntry[];
  /** false, пока не завершена попытка загрузки удалённого JSON (если URL задан). */
  knowledgeReady: boolean;
};

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

const initialParsed = parseKnowledgeJson(bundled);
const initialEntries: KnowledgeEntry[] = initialParsed ?? [];

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(initialEntries);
  const [knowledgeReady, setKnowledgeReady] = useState(() => !getKnowledgeJsonUrl());

  useEffect(() => {
    const url = getKnowledgeJsonUrl();
    if (!url) {
      setKnowledgeReady(true);
      return;
    }
    setKnowledgeReady(false);
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        const parsed = parseKnowledgeJson(json);
        if (parsed) setEntries(parsed);
        else if (__DEV__) console.warn('[knowledge] remote JSON invalid, keeping bundle');
      })
      .catch(() => {
        if (__DEV__) console.warn('[knowledge] remote fetch failed, using bundle');
      })
      .finally(() => {
        if (!cancelled) setKnowledgeReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ entries, knowledgeReady }), [entries, knowledgeReady]);

  return <KnowledgeContext.Provider value={value}>{children}</KnowledgeContext.Provider>;
}

export function useKnowledgeEntries(): KnowledgeEntry[] {
  const ctx = useContext(KnowledgeContext);
  if (!ctx) throw new Error('useKnowledgeEntries must be used within KnowledgeProvider');
  return ctx.entries;
}

export function useKnowledgeReady(): boolean {
  const ctx = useContext(KnowledgeContext);
  if (!ctx) throw new Error('useKnowledgeReady must be used within KnowledgeProvider');
  return ctx.knowledgeReady;
}
