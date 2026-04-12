/**
 * Тест брони 1 ч: логин → прайс → available-pcs → POST /booking (сравнение с/без price_id; в приложении почасовку без price_id).
 * Запуск: node scripts/test-booking-hourly-pc10.mjs
 */
import crypto from 'crypto';
import https from 'https';

const BASE = 'vibe.blackbearsplay.ru';
const SECRET = 'M0R4SGnGrNnNFkeT2125LFB0cAHbBkXD';

function req(method, path, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: BASE, path, method, headers: { Accept: 'application/json', ...headers } };
    const r = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        let json;
        try {
          json = d ? JSON.parse(d) : null;
        } catch {
          json = d;
        }
        resolve({ status: res.statusCode, json, raw: d });
      });
    });
    r.on('error', reject);
    if (body != null) r.end(body);
    else r.end();
  });
}

function pcLooseSame(a, b) {
  const ta = String(a).trim();
  const tb = String(b).trim();
  if (ta.toLowerCase() === tb.toLowerCase()) return true;
  const na = parseInt(ta.replace(/\D/g, ''), 10);
  const nb = parseInt(tb.replace(/\D/g, ''), 10);
  return Number.isFinite(na) && Number.isFinite(nb) && na > 0 && na === nb;
}

function normalizeZoneKey(raw) {
  if (raw == null) return '';
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

function parseDigitOnlyDurationToMins(raw) {
  const d = String(raw).trim();
  if (!/^\d+$/.test(d)) return null;
  const n = parseInt(d, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 7) return n;
  if (n === 1) return 60;
  if (n >= 2 && n <= 6) return n * 60;
  return n;
}

function parseMinsFromPriceItem(p) {
  const d = String(p.duration ?? '').trim();
  if (d) {
    const digitMins = parseDigitOnlyDurationToMins(d);
    if (digitMins != null) return digitMins;
    const mm = /(\d+)\s*(?:мин|min)/i.exec(d);
    if (mm) return parseInt(mm[1], 10);
    const hh = /(\d+)\s*(?:ч|h)/i.exec(d);
    if (hh) return parseInt(hh[1], 10) * 60;
  }
  return 0;
}

function priceTierSame(a, b) {
  const ma = parseMinsFromPriceItem(a);
  const mb = parseMinsFromPriceItem(b);
  if (ma > 0 && mb > 0) return ma === mb;
  return String(a.duration ?? '') === String(b.duration ?? '');
}

function pcPriceZoneKey(pc) {
  const g = typeof pc.pc_group_name === 'string' ? pc.pc_group_name.trim() : '';
  if (g.length > 0) return normalizeZoneKey(g);
  const a = typeof pc.pc_area_name === 'string' ? pc.pc_area_name.trim() : '';
  return normalizeZoneKey(a);
}

function pickByZone(candidates, zoneKey) {
  if (candidates.length === 0) return null;
  if (!zoneKey) {
    const ungrouped = candidates.find((c) => !c.group_name || String(c.group_name).trim() === '');
    return ungrouped ?? candidates[0] ?? null;
  }
  const exact = candidates.find((c) => normalizeZoneKey(c.group_name) === zoneKey);
  if (exact) return exact;
  const z = zoneKey.replace(/[^a-zа-яё0-9]/gi, '');
  const fuzzy = candidates.find((c) => {
    const g = normalizeZoneKey(c.group_name);
    const cg = g.replace(/[^a-zа-яё0-9]/gi, '');
    return (
      g &&
      cg.length >= 3 &&
      z.length >= 3 &&
      cg === z &&
      (g.includes(zoneKey) || zoneKey.includes(g))
    );
  });
  if (fuzzy) return fuzzy;
  const ungrouped = candidates.find((c) => !c.group_name || String(c.group_name).trim() === '');
  if (ungrouped) return ungrouped;
  const defaultNamed = candidates.find((c) => /default/i.test(String(c.price_name ?? '').trim()));
  if (defaultNamed) return defaultNamed;
  return candidates[0] ?? null;
}

function hourlyCandidatesForSessionMins(prices, sessionMins) {
  if (!prices.length) return [];
  const scored = prices.map((p) => ({
    p,
    diff: Math.abs(parseMinsFromPriceItem(p) - sessionMins),
  }));
  const bestDiff = Math.min(...scored.map((s) => s.diff));
  return scored.filter((s) => s.diff === bestDiff).map((s) => s.p);
}

function pickHourlyTemplateForSessionMins(prices, sessionMins) {
  const pool = hourlyCandidatesForSessionMins(prices, sessionMins);
  if (pool.length === 0) return null;
  const preferred = pool.find((p) => /default/i.test(String(p.price_name ?? '').trim()));
  if (preferred) return preferred;
  const sorted = [...pool].sort((a, b) =>
    String(a.group_name ?? '').localeCompare(String(b.group_name ?? ''), undefined, { sensitivity: 'base' }),
  );
  return sorted[0] ?? null;
}

function resolvePriceForPc(template, pc, prices) {
  const zoneKey = pcPriceZoneKey(pc);
  const tier = template;
  const candidates = prices.filter((p) => priceTierSame(p, tier));
  if (candidates.length === 0) return null;
  const hasAnyGroup = candidates.some((c) => !!c.group_name && String(c.group_name).trim() !== '');
  if (!hasAnyGroup) {
    return candidates.some((c) => c.price_id === tier.price_id) ? tier : candidates[0];
  }
  return pickByZone(candidates, zoneKey);
}

function matchPriceTierToMinutes(prices, template, sessionMins) {
  const sameFamily = prices.filter(
    (p) =>
      p.price_id === template.price_id && String(p.group_name ?? '') === String(template.group_name ?? ''),
  );
  if (sameFamily.length === 0) return template;
  let best = sameFamily[0];
  let bestDiff = Infinity;
  for (const p of sameFamily) {
    const tierMins = parseMinsFromPriceItem(p);
    const diff = Math.abs(tierMins - sessionMins);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best;
}

async function main() {
  const user = process.env.BB_TEST_USER || 'test3';
  const pass = process.env.BB_TEST_PASS || 'test3';
  const dateStart = process.env.BB_TEST_DATE || '2026-04-12';
  const timeStart = process.env.BB_TEST_TIME || '10:30';
  const mins = Number(process.env.BB_TEST_MINS || '60');
  const wantPc = process.env.BB_TEST_PC || 'PC10';

  console.log('--- test booking 1h', { user, dateStart, timeStart, mins, wantPc, BASE });

  const loginBody = JSON.stringify({ username: user, member_name: user, password: pass });
  const login = await req('POST', '/login', {
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) },
    body: loginBody,
  });
  console.log('\n1) POST /login → HTTP', login.status, 'outer', login.json?.code, login.json?.message ?? '');
  if (login.status !== 200 || !login.json?.member) {
    console.log('FAIL login raw:', login.raw?.slice(0, 800));
    process.exit(1);
  }
  const memberId = String(login.json.member.member_id);
  const privateKey = String(login.json.private_key);
  const icafeId = Number(login.json.member.member_icafe_id);
  console.log('   member_id=', memberId, 'icafe_id=', icafeId);

  const pricesPath = `/all-prices-icafe?cafeId=${icafeId}&memberId=${encodeURIComponent(memberId)}&mins=${mins}&bookingDate=${encodeURIComponent(dateStart)}`;
  const pr = await req('GET', pricesPath);
  console.log('\n2) GET /all-prices-icafe → HTTP', pr.status, 'outer', pr.json?.code);
  const root = pr.json?.data ?? pr.json;
  const prices = Array.isArray(root?.prices)
    ? root.prices.filter((p) => {
        const id = Number(p.price_id);
        return Number.isFinite(id) && id > 0;
      })
    : [];
  console.log('   prices rows:', prices.length);
  if (!prices.length) {
    console.log('FAIL no prices. raw:', pr.raw?.slice(0, 1200));
    process.exit(1);
  }

  const avail = await req(
    'GET',
    `/available-pcs-for-booking?cafeId=${icafeId}&dateStart=${encodeURIComponent(dateStart)}&timeStart=${encodeURIComponent(timeStart)}&mins=${mins}`,
  );
  console.log('\n3) GET /available-pcs-for-booking → HTTP', avail.status, 'outer', avail.json?.code);
  const pcList = avail.json?.data?.pc_list ?? [];
  const free = pcList.filter((p) => !p.is_using);
  const pc = free.find((p) => pcLooseSame(p.pc_name, wantPc));
  if (!pc) {
    console.log('FAIL PC not among free. want', wantPc, 'free:', free.map((x) => x.pc_name).join(', '));
    process.exit(1);
  }
  console.log('   picked', pc.pc_name, 'zone=', pc.pc_area_name ?? '', 'group=', pc.pc_group_name ?? '');

  const template = pickHourlyTemplateForSessionMins(prices, mins);
  if (!template) {
    console.log('FAIL no hourly template for', mins, 'min');
    process.exit(1);
  }
  const resolved = resolvePriceForPc(template, pc, prices);
  if (!resolved) {
    console.log('FAIL resolve tariff for zone', pcPriceZoneKey(pc));
    process.exit(1);
  }
  const tier = matchPriceTierToMinutes(prices, resolved, mins);
  const price_id = tier.price_id;
  console.log('\n4) chosen price_id=', price_id, {
    price_name: tier.price_name,
    group_name: tier.group_name,
    duration: tier.duration,
    template_price_id: template.price_id,
  });

  const common = {
    icafe_id: icafeId,
    pc_name: pc.pc_name,
    member_account: user,
    member_id: memberId,
    start_date: dateStart,
    start_time: timeStart,
    mins,
  };

  function sign(randKey) {
    return crypto.createHash('md5').update(memberId + randKey + privateKey + SECRET).digest('hex');
  }

  const rkA = crypto.randomBytes(4).toString('hex').slice(0, 8);
  const payloadNoPrice = { ...common, rand_key: rkA, key: sign(rkA) };

  const rkB = crypto.randomBytes(4).toString('hex').slice(0, 8);
  const payloadWithPrice = { ...common, rand_key: rkB, key: sign(rkB), price_id };

  const onlyWithPrice = process.env.BB_ONLY_WITH_PRICE === '1';

  if (!onlyWithPrice) {
    console.log('\n5a) POST /booking БЕЗ price_id …');
    const bookA = await req('POST', '/booking', {
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payloadNoPrice)),
      },
      body: JSON.stringify(payloadNoPrice),
    });
    printBookingResponse('   ', bookA);
  } else {
    console.log('\n5a) пропуск (BB_ONLY_WITH_PRICE=1)');
  }

  console.log('\n5b) POST /booking С price_id=', price_id, '…');
  const bookB = await req('POST', '/booking', {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(payloadWithPrice)),
    },
    body: JSON.stringify(payloadWithPrice),
  });
  printBookingResponse('   ', bookB);

  console.log('\n--- raw 5b (first 2500 chars) ---\n', bookB.raw?.slice(0, 2500));
}

function printBookingResponse(prefix, book) {
  console.log(prefix, 'HTTP', book.status);
  const j = book.json;
  if (!j || typeof j !== 'object') {
    console.log(prefix, 'body:', String(book.raw).slice(0, 500));
    return;
  }
  console.log(prefix, 'outer code:', j.code, 'message:', j.message);
  const nested = j.iCafe_response ?? j.i_cafe_response;
  if (nested) {
    console.log(prefix, 'iCafe code:', nested.code, 'message:', nested.message);
    if (nested.data && typeof nested.data === 'object') {
      const msg = nested.data.message ?? nested.data.msg;
      if (msg) console.log(prefix, 'iCafe data.message:', msg);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
