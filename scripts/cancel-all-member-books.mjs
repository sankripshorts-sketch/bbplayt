/**
 * Логин → GET /all-books-cafes → для каждой активной брони
 * DELETE /api/v2/cafe/{icafeId}/bookings (iCafe Cloud; на vibe POST /booking-cancel может быть «Api not allowed»).
 * Запуск: BB_TEST_USER=test3 BB_TEST_PASS=test3 node scripts/cancel-all-member-books.mjs
 */
import https from 'https';

const BASE = process.env.BB_API_HOST || 'vibe.blackbearsplay.ru';

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
        resolve({
          status: res.statusCode,
          json,
          raw: d,
          setCookie: res.headers['set-cookie']?.join('; ') ?? '',
        });
      });
    });
    r.on('error', reject);
    if (body != null) r.end(body);
    else r.end();
  });
}

function parseBooksEnvelope(data) {
  if (!data || typeof data !== 'object') return {};
  const inner = data.data !== undefined ? data.data : data;
  if (!inner || typeof inner !== 'object') return {};
  return inner;
}

async function main() {
  const user = process.env.BB_TEST_USER || 'test3';
  const pass = process.env.BB_TEST_PASS || 'test3';

  console.log('1) POST /login …', user);
  const loginBody = JSON.stringify({ username: user, member_name: user, password: pass });
  const login = await req('POST', '/login', {
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) },
    body: loginBody,
  });
  if (login.status !== 200 || !login.json?.member) {
    console.error('Login failed:', login);
    process.exit(1);
  }
  const token =
    login.json.token ||
    login.json.access_token ||
    login.json.data?.token ||
    login.json.member?.token;
  const authToken = token ? String(token) : '';
  const cookie = login.setCookie || '';

  const authHeaders = {};
  if (authToken) authHeaders.Authorization = `Bearer ${authToken}`;
  if (cookie) authHeaders.Cookie = cookie;

  console.log('2) GET /all-books-cafes …');
  const booksRes = await req('GET', `/all-books-cafes?memberAccount=${encodeURIComponent(user)}`, {
    headers: authHeaders,
  });
  if (booksRes.status !== 200) {
    console.error('all-books failed:', booksRes);
    process.exit(1);
  }
  const byClub = parseBooksEnvelope(booksRes.json);
  const now = Date.now();

  /** Naive YYYY-MM-DD HH:mm:ss → UTC Date (Europe/Moscow +3, как в приложении). */
  function moscowNaiveToUtc(s) {
    const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const ss = m[6] != null ? Number(m[6]) : 0;
    const ms = Date.UTC(y, mo - 1, d, hh, mm, ss) - 3 * 60 * 60 * 1000;
    return new Date(ms);
  }

  let cancelled = 0;
  for (const [icafeId, rowsRaw] of Object.entries(byClub)) {
    const rows = Array.isArray(rowsRaw) ? rowsRaw : rowsRaw ? [rowsRaw] : [];
    for (const row of rows) {
      const from = row.product_available_date_local_from;
      const to = row.product_available_date_local_to;
      const end = moscowNaiveToUtc(to);
      if (end && end.getTime() <= now) {
        console.log('  skip ended', icafeId, row.product_pc_name, to);
        continue;
      }
      const offerRaw = row.member_offer_id;
      const offerId =
        typeof offerRaw === 'number' && offerRaw > 0 ? offerRaw : Number(row.product_id) || 0;
      if (offerId <= 0) {
        console.warn('  skip no offer id', icafeId, row);
        continue;
      }
      const delBody = JSON.stringify({
        pc_name: String(row.product_pc_name ?? ''),
        member_offer_id: offerId,
      });
      console.log('3) DELETE /api/v2/cafe/.../bookings …', {
        icafe_id: icafeId,
        pc_name: row.product_pc_name,
        member_offer_id: offerId,
      });
      const cancel = await req('DELETE', `/api/v2/cafe/${encodeURIComponent(icafeId)}/bookings`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(delBody),
        },
        body: delBody,
      });
      const ok =
        cancel.status === 200 &&
        cancel.json &&
        (cancel.json.code === 200 ||
          cancel.json.code === 0 ||
          cancel.json.code === 3 ||
          (cancel.json.data && cancel.json.data.error_count === 0));
      console.log('   HTTP', cancel.status, cancel.json?.code, cancel.json?.message ?? '');
      if (ok) {
        cancelled += 1;
      } else {
        console.error('   cancel body:', cancel.raw?.slice(0, 500));
      }
    }
  }

  console.log(`\nГотово: отправлено отмен: ${cancelled} (проверьте ответы iCafe выше).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
