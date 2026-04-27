import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import bundled from '../../assets/knowledge.json';
import { useAppAlert } from '../components/AppAlertContext';
import { useLocale } from '../i18n/LocaleContext';
import { bookingFlowApi, cafesApi } from '../api/endpoints';
import type { AllPricesData, CafeItem, StructRoomsData } from '../api/types';
import { buildPriceKnowledge } from './priceKnowledge';
import { buildStructKnowledge } from './structKnowledge';
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

function nonEmpty(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function splitKeywords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3);
}

function cafeLabel(cafe: CafeItem): string {
  return nonEmpty(cafe.name) ?? cafe.address;
}

function cafeLine(cafe: CafeItem): string {
  const parts: string[] = [cafeLabel(cafe), cafe.address];
  if (nonEmpty(cafe.phone)) parts.push(`тел.: ${cafe.phone}`);
  if (nonEmpty(cafe.vk_url)) parts.push(`VK: ${cafe.vk_url}`);
  if (nonEmpty(cafe.site)) parts.push(`сайт: ${cafe.site}`);
  return `- ${parts.join(' · ')}`;
}

function buildApiKnowledge(cafes: CafeItem[]): KnowledgeEntry[] {
  if (cafes.length === 0) return [];
  const lines = cafes.map(cafeLine);
  const byCity = new Map<string, CafeItem[]>();
  for (const cafe of cafes) {
    const key = cafe.address.split(',')[0]?.trim() || 'другой город';
    const list = byCity.get(key);
    if (list) list.push(cafe);
    else byCity.set(key, [cafe]);
  }
  const cityLines = [...byCity.entries()].map(([city, list]) => {
    const names = list
      .map((x) => cafeLabel(x))
      .slice(0, 4)
      .join(', ');
    const suffix = list.length > 4 ? ` и ещё ${list.length - 4}` : '';
    return `- ${city}: ${names}${suffix}`;
  });

  const perClub = cafes.map((cafe): KnowledgeEntry => {
    const label = cafeLabel(cafe);
    const answerParts = [`Клуб: ${label}.`, `Адрес: ${cafe.address}.`];
    if (nonEmpty(cafe.phone)) answerParts.push(`Телефон: ${cafe.phone}.`);
    if (nonEmpty(cafe.vk_url)) answerParts.push(`VK: ${cafe.vk_url}.`);
    if (nonEmpty(cafe.site)) answerParts.push(`Сайт: ${cafe.site}.`);
    answerParts.push('Быстро перейти к брони можно через «Клубы» → «Бронирование».');
    return {
      id: `club-api-${cafe.icafe_id}`,
      category: 'club',
      question: `${label}: адрес, контакты и как связаться`,
      answer: answerParts.join(' '),
      keywords: [
        'клуб',
        'адрес',
        'телефон',
        'контакты',
        'вконтакте',
        'сайт',
        ...splitKeywords(label),
        ...splitKeywords(cafe.address),
      ],
    };
  });

  return [
    {
      id: 'club-locations',
      category: 'club',
      question: 'Где находятся клубы BBplay: адреса и контакты',
      answer:
        `Доступные клубы (${cafes.length}):\n` +
        `${lines.join('\n')}\n\n` +
        'Актуальные данные обновляются автоматически из каталога клубов.',
      keywords: [
        'где клуб',
        'адрес',
        'адреса',
        'как добраться',
        'контакты',
        'телефон клуба',
        'клубы bbplay',
      ],
    },
    {
      id: 'club-city-coverage',
      category: 'club',
      question: 'В каких городах есть клубы',
      answer:
        'Клубы доступны в следующих городах:\n' +
        cityLines.join('\n') +
        '\n\nЕсли нужно, подскажу конкретный клуб по вашему району.',
      keywords: ['какие города', 'города', 'где есть клуб', 'филиалы по городам', 'город'],
    },
    {
      id: 'club-contact-channels',
      category: 'support',
      question: 'Как быстро связаться с конкретным клубом',
      answer:
        'Откройте вкладку «Клубы», выберите точку и нажмите на телефон/VK/сайт. ' +
        'Контакты показываются для каждого филиала отдельно.',
      keywords: ['связаться', 'позвонить', 'контакты', 'телефон', 'вк', 'сайт', 'администратор'],
    },
    ...perClub,
  ];
}

function mergeKnowledge(base: KnowledgeEntry[], patch: KnowledgeEntry[]): KnowledgeEntry[] {
  if (patch.length === 0) return base;
  const out = new Map<string, KnowledgeEntry>(base.map((e) => [e.id, e]));
  for (const item of patch) out.set(item.id, item);
  return [...out.values()];
}

type KnowledgeContextValue = {
  entries: KnowledgeEntry[];
  /** false, пока не завершена попытка загрузки удалённого JSON (если URL задан). */
  knowledgeReady: boolean;
};

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

const initialParsed = parseKnowledgeJson(bundled);
const initialEntries: KnowledgeEntry[] = initialParsed ?? [];

let startupCafesLoadAlertShown = false;

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const { showAlert } = useAppAlert();
  const [entries, setEntries] = useState<KnowledgeEntry[]>(initialEntries);
  // Bundled knowledge is available synchronously, so the app can proceed immediately.
  const [knowledgeReady, setKnowledgeReady] = useState(true);

  useEffect(() => {
    const url = getKnowledgeJsonUrl();
    let cancelled = false;
    let cafesListLoadFailed = false;

    const remotePromise: Promise<KnowledgeEntry[]> = url
      ? fetch(url)
          .then((r) => {
            if (!r.ok) throw new Error(String(r.status));
            return r.json();
          })
          .then((json) => {
            const parsed = parseKnowledgeJson(json);
            if (parsed) return parsed;
            if (__DEV__) console.warn('[knowledge] remote JSON invalid, keeping bundle');
            return initialEntries;
          })
          .catch(() => {
            if (__DEV__) console.warn('[knowledge] remote fetch failed, using bundle');
            return initialEntries;
          })
      : Promise.resolve(initialEntries);

    Promise.all([
      remotePromise,
      cafesApi.list().catch(() => {
        cafesListLoadFailed = true;
        if (__DEV__) console.warn('[knowledge] cafes API unavailable, keeping base entries');
        return [] as CafeItem[];
      }),
    ])
      .then(async ([baseEntries, cafes]) => {
        if (cancelled) return;
        let pricesArr: (AllPricesData | null)[] = [];
        let structArr: (StructRoomsData | null)[] = [];
        if (cafes.length > 0) {
          [pricesArr, structArr] = await Promise.all([
            Promise.all(
              cafes.map((c) =>
                bookingFlowApi.allPrices({ cafeId: c.icafe_id }).catch((): null => {
                  if (__DEV__) {
                    console.warn('[knowledge] all-prices-icafe failed for cafe', c.icafe_id);
                  }
                  return null;
                }),
              ),
            ),
            Promise.all(
              cafes.map((c) =>
                bookingFlowApi.structRooms(c.icafe_id).catch((): null => {
                  if (__DEV__) {
                    console.warn('[knowledge] struct-rooms-icafe failed for cafe', c.icafe_id);
                  }
                  return null;
                }),
              ),
            ),
          ]);
        }

        const apiEntries = buildApiKnowledge(cafes);
        const priceEntries = buildPriceKnowledge(cafes, pricesArr);
        const structEntries = buildStructKnowledge(cafes, structArr);

        if (cancelled) return;
        setEntries(
          mergeKnowledge(baseEntries, [
            ...apiEntries,
            ...priceEntries,
            ...structEntries,
          ]),
        );
      })
      .finally(() => {
        if (cancelled) return;
        // Keep readiness stable after first mount; background refresh should not re-block startup.
        setKnowledgeReady(true);
        if (cafesListLoadFailed && !startupCafesLoadAlertShown) {
          startupCafesLoadAlertShown = true;
          showAlert(
            t('startup.cafesUnavailableTitle'),
            t('startup.cafesUnavailableMessage'),
            [{ text: t('verify.alertOk') }],
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

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
