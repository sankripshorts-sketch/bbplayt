/**
 * Одноразовая проверка: логин → свободный ПК/слот → POST /booking (JSON) → разбор ответа.
 * Запуск: node scripts/verify-booking-e2e.mjs
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

async function main() {
  const user = process.env.BB_TEST_USER || 'test1';
  const pass = process.env.BB_TEST_PASS || 'test1';

  console.log('1) POST /login …');
  const loginBody = JSON.stringify({ username: user, member_name: user, password: pass });
  const login = await req('POST', '/login', {
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) },
    body: loginBody,
  });
  if (login.status !== 200 || !login.json?.member) {
    console.error('Login failed:', login);
    process.exit(1);
  }
  const memberId = String(login.json.member.member_id);
  const privateKey = String(login.json.private_key);
  const icafeId = Number(login.json.member.member_icafe_id);
  console.log('   ok member_id=%s icafe_id=%s', memberId, icafeId);

  const dateStart = process.env.BB_TEST_DATE || '2026-04-20';
  const timeStart = process.env.BB_TEST_TIME || '16:00';
  const mins = Number(process.env.BB_TEST_MINS || '90');

  console.log('2) GET /available-pcs-for-booking …', { cafeId: icafeId, dateStart, timeStart, mins });
  const avail = await req(
    'GET',
    `/available-pcs-for-booking?cafeId=${icafeId}&dateStart=${encodeURIComponent(dateStart)}&timeStart=${encodeURIComponent(timeStart)}&mins=${mins}`,
  );
  if (avail.status !== 200 || avail.json?.code !== 0 || !avail.json?.data?.pc_list?.length) {
    console.error('available-pcs failed:', avail);
    process.exit(1);
  }
  /** PC09 ↔ PC9 ↔ 9 (как в приложении `pcNamesLooselyEqual`). */
  function pcLooseSame(a, b) {
    const ta = String(a).trim();
    const tb = String(b).trim();
    if (ta.toLowerCase() === tb.toLowerCase()) return true;
    const na = parseInt(ta.replace(/\D/g, ''), 10);
    const nb = parseInt(tb.replace(/\D/g, ''), 10);
    return Number.isFinite(na) && Number.isFinite(nb) && na > 0 && na === nb;
  }

  const zoneNeedle = process.env.BB_TEST_ZONE?.trim().toLowerCase();
  let candidates = avail.json.data.pc_list.filter((p) => !p.is_using);
  if (zoneNeedle) {
    candidates = candidates.filter((p) =>
      String(p.pc_area_name ?? '')
        .toLowerCase()
        .includes(zoneNeedle),
    );
  }
  const wantPc = process.env.BB_TEST_PC?.trim();
  if (wantPc) {
    const narrowed = candidates.filter((p) => pcLooseSame(p.pc_name, wantPc));
    if (narrowed.length) {
      candidates = narrowed;
    } else {
      console.error(
        'BB_TEST_PC=%s not among free PCs. Free:',
        wantPc,
        candidates.map((p) => p.pc_name),
      );
      process.exit(1);
    }
  }
  if (!candidates.length) {
    console.error('No matching free PC (BB_TEST_ZONE=%s). List:', zoneNeedle ?? '(any)', avail.json.data.pc_list);
    process.exit(1);
  }
  const pc = candidates[0];
  const pcName = pc.pc_name;
  console.log('   ok picked PC:', pcName, pc.pc_area_name || '');

  const rand_key = crypto.randomBytes(4).toString('hex').slice(0, 8);
  const key = crypto.createHash('md5').update(memberId + rand_key + privateKey + SECRET).digest('hex');

  const bookingPayload = {
    icafe_id: icafeId,
    pc_name: pcName,
    member_account: user,
    member_id: memberId,
    start_date: dateStart,
    start_time: timeStart,
    mins,
    rand_key,
    key,
  };
  const bookingJson = JSON.stringify(bookingPayload);

  console.log('3) POST /booking (JSON) …', { pc_name: pcName, start_date: dateStart, start_time: timeStart, mins });
  const book = await req('POST', '/booking', {
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bookingJson) },
    body: bookingJson,
  });

  const j = book.json;
  const okOuter = j && (j.code === 3 || j.code === 0);
  const nested = j?.iCafe_response ?? j?.i_cafe_response;
  const nestedOk = nested && String(nested.code) === '200';
  const pwd = nested?.data?.booking_password;
  const cost = j?.booking_cost;

  console.log('   HTTP', book.status, 'outer code', j?.code, 'message', j?.message);
  if (nested) console.log('   iCafe code', nested.code, nested.message);
  if (pwd) console.log('   booking_password:', pwd);
  if (cost != null) console.log('   booking_cost:', cost);

  if (!okOuter || !nestedOk || !pwd) {
    console.error('Booking did not return success + booking_password:', book.raw?.slice(0, 2000));
    process.exit(1);
  }

  console.log('4) GET /all-books-cafes (smoke) …');
  const books = await req('GET', `/all-books-cafes?memberAccount=${encodeURIComponent(user)}`);
  const list = books.json?.data?.[String(icafeId)];
  const found = Array.isArray(list) && list.some((b) => String(b.product_pc_name) === String(pcName));
  console.log('   HTTP', books.status, 'club bookings:', Array.isArray(list) ? list.length : 'n/a', found ? '(new PC present in list)' : '(list ok)');

  console.log('\nOK: бронь создана, сервер вернул booking_password и iCafe success.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
