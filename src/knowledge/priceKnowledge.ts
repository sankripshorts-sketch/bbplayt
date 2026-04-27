import type { AllPricesData, CafeItem, PriceItem, ProductItem } from '../api/types';
import type { KnowledgeEntry } from './types';

function cafeTitle(c: CafeItem): string {
  return (c.name?.trim() || c.address).trim();
}

function formatRub(s: string | undefined): string {
  if (!s) return '';
  const n = parseFloat(String(s).replace(',', '.'));
  if (!Number.isFinite(n)) return s.trim();
  return n === Math.floor(n) ? String(Math.floor(n)) : n.toFixed(0);
}

function parseDurationMins(d: string | undefined): number | null {
  if (d == null) return null;
  const n = Number(String(d).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Снимок из /all-prices-icafe: по каждой зоне одна «почасовая» строка
 * (предпочтительно длительность 60 мин; иначе первая строка с `price_price1`).
 */
function hourlyLinesByGroup(prices: PriceItem[]): { group: string; perHour: string; priceName: string }[] {
  const byGroup = new Map<string, PriceItem[]>();
  for (const p of prices) {
    const g = (p.group_name ?? p.price_name ?? 'Default').trim() || 'Default';
    const list = byGroup.get(g) ?? [];
    list.push(p);
    byGroup.set(g, list);
  }
  const out: { group: string; perHour: string; priceName: string }[] = [];
  for (const [group, rows] of byGroup) {
    const withHour = rows.find(
      (r) => r.price_price1 && parseDurationMins(r.duration) === 60,
    );
    const pick = withHour ?? rows.find((r) => r.price_price1) ?? rows[0];
    const per = pick.price_price1?.trim();
    if (!per) continue;
    out.push({
      group,
      perHour: formatRub(per),
      priceName: (pick.price_name ?? group).trim(),
    });
  }
  out.sort((a, b) => a.group.localeCompare(b.group, 'ru'));
  return out;
}

function productLines(products: ProductItem[], max: number): string[] {
  const lines: string[] = [];
  for (const p of products) {
    if (lines.length >= max) break;
    const name = p.product_name?.trim();
    if (!name) continue;
    const price = formatRub(p.product_price ?? p.total_price);
    if (price) lines.push(`«${name}» — ${price} ₽`);
    else lines.push(`«${name}»`);
  }
  return lines;
}

function parseProductDurationMins(product: ProductItem): number | null {
  const direct = parseDurationMins(product.duration_min ?? product.duration);
  if (direct) return direct;
  const name = String(product.product_name ?? '').toLowerCase();
  const hourMatch = name.match(/(\d{1,2})\s*(?:ч|час)/u);
  if (hourMatch) {
    const h = Number(hourMatch[1]);
    if (Number.isFinite(h) && h > 0) return h * 60;
  }
  const minMatch = name.match(/(\d{2,3})\s*мин/u);
  if (minMatch) {
    const m = Number(minMatch[1]);
    if (Number.isFinite(m) && m > 0) return m;
  }
  return null;
}

function findPackagePriceByHours(products: ProductItem[], hours: number): string | null {
  const targetMins = hours * 60;
  const candidate = products.find((p) => parseProductDurationMins(p) === targetMins);
  if (!candidate) return null;
  const price = formatRub(candidate.product_price ?? candidate.total_price);
  return price || null;
}

function zoneLabelRu(raw: string): string {
  const v = raw.toLowerCase();
  if (v.includes('vip') || v.includes('вип')) return 'VIP-зона';
  if (v.includes('bootcamp') || v.includes('буткемп')) return 'BootCamp-зона';
  if (v.includes('gamezone') || v.includes('гейм')) return 'GameZone-зона';
  if (v.includes('default') || v.includes('стандарт')) return 'Основной зал';
  return `${raw} зона`;
}

function formatClubPriceBlock(cafe: CafeItem, data: AllPricesData): string {
  const label = cafeTitle(cafe);
  const address = String(cafe.address || label).trim();
  const hours = hourlyLinesByGroup(data.prices);
  const lines: string[] = [];
  if (hours.length > 0) {
    for (const h of hours) {
      lines.push(`${zoneLabelRu(h.group)} в клубе ${address} стоит ${h.perHour} рублей за час.`);
    }
  }
  const package3h = findPackagePriceByHours(data.products, 3);
  const package5h = findPackagePriceByHours(data.products, 5);
  if (package3h || package5h) {
    if (package3h && package5h) {
      lines.push(`Если не указали конкретный пакет: на 3 часа — ${package3h} рублей, на 5 часов — ${package5h} рублей.`);
    } else if (package3h) {
      lines.push(`Если не указали конкретный пакет: пакет на 3 часа стоит ${package3h} рублей.`);
    } else if (package5h) {
      lines.push(`Если не указали конкретный пакет: пакет на 5 часов стоит ${package5h} рублей.`);
    }
  }
  const prods = productLines(data.products, 6);
  if (prods.length) {
    lines.push('Другие пакеты и цены: ' + prods.join('; ') + (data.products.length > 6 ? ' — и другие варианты в каталоге брони.' : '.'));
  }
  lines.push('Ночные пакеты отображаются в разделе «Бронь» после выбора клуба, даты, времени и места.');
  return lines.join(' ');
}

/**
 * Карточки с цифрами из /all-prices-icafe. При пустом ответе — [] (не перетираем bundled JSON).
 */
export function buildPriceKnowledge(
  cafes: CafeItem[],
  allPrices: (AllPricesData | null)[],
): KnowledgeEntry[] {
  if (cafes.length === 0) return [];
  const pairs: { cafe: CafeItem; data: AllPricesData }[] = [];
  for (let i = 0; i < cafes.length; i++) {
    const d = allPrices[i];
    if (d && Array.isArray(d.prices) && d.prices.length > 0) {
      pairs.push({ cafe: cafes[i], data: d });
    }
  }
  if (pairs.length === 0) return [];

  const splitAddr = (c: CafeItem) => {
    const t = c.address.toLowerCase();
    return t
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 3);
  };
  const splitName = (c: CafeItem) => {
    const t = (c.name ?? c.address).toLowerCase();
    return t
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 3);
  };

  const blocks = pairs.map(({ cafe, data }) => formatClubPriceBlock(cafe, data));
  const firstHourly = hourlyLinesByGroup(pairs[0].data.prices);
  const zoneKeywords = firstHourly.flatMap((h) => [h.group.toLowerCase(), h.priceName.toLowerCase()]);

  const combinedAnswer = [
    'Ниже — актуальные тарифы по зонам и пакетам. Если не указать конкретный пакет, показываем базовые цены за 3 и 5 часов (когда они есть в прайсе клуба).',
    '',
    ...blocks,
  ].join('\n');

  const out: KnowledgeEntry[] = [
    {
      id: 'payment-rates-timeofday',
      category: 'payment',
      question: 'Сколько стоит час или ночной пакет? Актуальные тарифы по времени суток',
      answer: combinedAnswer,
      keywords: [
        'сколько стоит',
        'стоимость',
        'цена',
        'час',
        'почасовка',
        'тариф',
        'все зоны',
        'по всем зонам',
        'каждая зона',
        'по каждой зоне',
        'про все зоны',
        'про каждую зону',
        'ночной',
        'ночник',
        'пакет',
        'до утра',
        'время суток',
        'утро',
        'вечер',
        'руб',
        '₽',
        'прайс',
        ...zoneKeywords,
      ],
    },
    {
      id: 'payment-tariffs-where',
      category: 'payment',
      question: 'Где посмотреть тарифы и цены?',
      answer:
        'Актуальные цифры берутся из прайса выбранного клуба: почасовка показывается по зонам, а ночные пакеты отображаются в разделе «Бронь» после выбора клуба, даты, времени и места.',
      keywords: ['тариф', 'цена', 'стоимость', 'час', 'пакет', 'сколько', 'стоит', 'цены', 'где посмотреть', 'прайс'],
    },
  ];

  for (const { cafe, data } of pairs) {
    const id = `payment-rates-club-${cafe.icafe_id}`;
    const kw = new Set<string>([
      'стоимость',
      'цена',
      'час',
      'тариф',
      'прайс',
      'сколько',
      'руб',
      'клуб',
      ...splitAddr(cafe),
      ...splitName(cafe),
    ]);
    for (const h of hourlyLinesByGroup(data.prices)) {
      kw.add(h.group.toLowerCase());
    }
    out.push({
      id,
      category: 'payment',
      question: `${cafeTitle(cafe)}: стоимость, почасовка по зонам`,
      answer: formatClubPriceBlock(cafe, data),
      keywords: [...kw].filter((x) => x.length >= 2),
    });
  }

  return out;
}
