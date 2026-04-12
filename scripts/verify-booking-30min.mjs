import crypto from 'crypto';
import https from 'https';

const BASE = 'vibe.blackbearsplay.ru';
const SECRET = 'M0R4SGnGrNnNFkeT2125LFB0cAHbBkXD';

function get(path) {
  return new Promise((resolve, reject) => {
    https
      .get({ hostname: BASE, path, headers: { Accept: 'application/json' } }, (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => resolve({ status: r.statusCode, json: JSON.parse(d) }));
      })
      .on('error', reject);
  });
}

function postJson(path, body) {
  const b = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: BASE,
        path,
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(b),
        },
      },
      (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => resolve({ status: r.statusCode, json: JSON.parse(d), raw: d }));
      },
    );
    req.on('error', reject);
    req.end(b);
  });
}

const date = process.env.BB_TEST_DATE || '2026-04-21';
const time = process.env.BB_TEST_TIME || '11:00';
const mins = Number(process.env.BB_TEST_MINS || '30');

const login = await postJson('/login', {
  username: 'test1',
  member_name: 'test1',
  password: 'test1',
});
const memberId = String(login.json.member.member_id);
const privateKey = login.json.private_key;
const icafeId = login.json.member.member_icafe_id;

console.log('=== GET /all-prices-icafe (тарифы с сервера) ===');
const prices = await get(
  `/all-prices-icafe?cafeId=${icafeId}&mins=${mins}&bookingDate=${encodeURIComponent(date)}`,
);
const pdata = prices.json?.data;
console.log('step_start_booking:', pdata?.step_start_booking);
console.log('time_tech_break:', pdata?.time_tech_break);
const vip30 = pdata?.prices?.find((p) => p.group_name === 'VIP' && String(p.duration) === '30');
const gz30 = pdata?.prices?.find((p) => p.group_name === 'GameZone' && String(p.duration) === '30');
console.log('пример строки 30 мин GameZone:', gz30?.price_name, 'total', gz30?.total_price, 'rub/h field', gz30?.price_price1);
console.log('пример строки 30 мин VIP:', vip30?.price_name, 'total', vip30?.total_price);

console.log('\n=== GET /available-pcs-for-booking mins=' + mins + ' ===');
const av = await get(
  `/available-pcs-for-booking?cafeId=${icafeId}&dateStart=${date}&timeStart=${time}&mins=${mins}`,
);
console.log('time_frame (шаг сетки в ответе):', av.json?.data?.time_frame);
const pc = av.json?.data?.pc_list?.[0];
console.log('первый свободный ПК:', pc?.pc_name, pc?.pc_area_name);

if (!pc) {
  console.error('Нет свободных ПК на слот');
  process.exit(1);
}

const rand_key = crypto.randomBytes(4).toString('hex').slice(0, 8);
const key = crypto.createHash('md5').update(memberId + rand_key + privateKey + SECRET).digest('hex');

console.log('\n=== POST /booking JSON, почасовая бронь 30 мин ===');
const book = await postJson('/booking', {
  icafe_id: Number(icafeId),
  pc_name: pc.pc_name,
  member_account: 'test1',
  member_id: memberId,
  start_date: date,
  start_time: time,
  mins,
  rand_key,
  key,
});

const bj = book.json;
console.log('HTTP', book.status);
console.log('outer:', { code: bj?.code, message: bj?.message, booking_cost: bj?.booking_cost });
const nested = bj?.iCafe_response ?? bj?.i_cafe_response;
if (nested) {
  console.log('iCafe:', { code: nested.code, message: nested.message });
  console.log('booking_password:', nested?.data?.booking_password);
}
