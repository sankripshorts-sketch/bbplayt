/**
 * (Опционально) скачать превью с Wikimedia Commons.
 * Сейчас в баре используются свои фото: см. `src/features/food/foodCatalog.ts` → `assets/food/*.png`.
 * Запуск: node scripts/fetch-wikimedia-food.mjs
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolve as urlResolve } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../assets/food');

const DELAY_MS = 4500;
const RETRY_ON_429 = 4;
const RETRY_WAIT_MS = 12000;

/** Локальное имя → thumburl (из API query/imageinfo iiurlwidth=500) */
const SOURCES = {
  'soda.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Coca-cola_50cl_can_-_Italia.jpg/500px-Coca-cola_50cl_can_-_Italia.jpg',
  'fanta.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Fanta_Orange_Bottle.jpg/500px-Fanta_Orange_Bottle.jpg',
  'redbull.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Red_Bull_%2820177175289%29.jpg/500px-Red_Bull_%2820177175289%29.jpg',
  /* full file — с thumb ловили 429 */
  'monster.jpg': 'https://upload.wikimedia.org/wikipedia/commons/0/09/Monster_Energy_drinks_02.jpg',
  'mors.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Lifetothefullest_cranberry_juice_bottle%2C_Hillegersberg%2C_Rotterdam_%282022%29_01.jpg/500px-Lifetothefullest_cranberry_juice_bottle%2C_Hillegersberg%2C_Rotterdam_%282022%29_01.jpg',
  'apple-juice.jpg': 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Apple_juice.jpg',
  'snickers.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Snickers-broken.JPG/500px-Snickers-broken.JPG',
  'twix.jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Twix-broken.jpg/500px-Twix-broken.jpg',
  'bounty.jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Bounty-Split.jpg/500px-Bounty-Split.jpg',
  'kinder-bueno.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Kinder-Bueno-Split.jpg/500px-Kinder-Bueno-Split.jpg',
  'milka.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Milka_Alpine_Milk_Chocolate_bar_100g.jpg/500px-Milka_Alpine_Milk_Chocolate_bar_100g.jpg',
  'lays.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Lay%27s_Sour_Cream_and_Onion_Potato_Chips%2C_Canada%2C_2026-02-15.jpg/500px-Lay%27s_Sour_Cream_and_Onion_Potato_Chips%2C_Canada%2C_2026-02-15.jpg',
  'pringles.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Pringles-165g-to-134g.jpg/500px-Pringles-165g-to-134g.jpg',
  'suhariki.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/1/11/No_name%C2%AE_CAESAR_CROUTONS_%284298446201%29.jpg',
  'oreo.jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Oreo-Two-Cookies.jpg/500px-Oreo-Two-Cookies.jpg',
  'doshirak.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/%D0%9B%D0%B0%D0%BF%D1%88%D0%B0_%D0%94%D0%BE%D1%88%D0%B8%D1%80%D0%B0%D0%BA.jpg/500px-%D0%9B%D0%B0%D0%BF%D1%88%D0%B0_%D0%94%D0%BE%D1%88%D0%B8%D1%80%D0%B0%D0%BA.jpg',
  'instant-noodles-chicken.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Nissin_Souper_Meal_-_Chicken.JPG/500px-Nissin_Souper_Meal_-_Chicken.JPG',
  'cheburek.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/5/5b/%D0%A7%D0%B5%D0%B1%D1%83%D1%80%D0%B5%D0%BA%D0%B8_%D0%B2_%D0%91%D0%B0%D1%88%D0%BA%D0%BE%D1%80%D1%82%D0%BE%D1%81%D1%82%D0%B0%D0%BD%D0%B52.jpg',
  'calzone.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Mega_calzone_-_ND0_3594_%288041010760%29.jpg/500px-Mega_calzone_-_ND0_3594_%288041010760%29.jpg',
};

function getWithRedirects(href) {
  return new Promise((resolve, reject) => {
    function g(u) {
      https
        .get(
          u,
          { headers: { 'User-Agent': 'BBplay/1.0 (food bar assets; Wikimedia Commons)' } },
          (r) => {
            if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
              g(urlResolve(u, r.headers.location));
              return;
            }
            if (r.statusCode === 429) {
              reject(Object.assign(new Error(`429 ${u}`), { code429: true }));
              return;
            }
            if (r.statusCode !== 200) {
              reject(new Error(`${r.statusCode} ${u}`));
              return;
            }
            const bufs = [];
            r.on('data', (c) => bufs.push(c));
            r.on('end', () => resolve(Buffer.concat(bufs)));
          },
        )
        .on('error', reject);
    }
    g(href);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  for (const [name, url] of Object.entries(SOURCES)) {
    const dest = path.join(outDir, name);
    process.stdout.write(`${name} ... `);
    for (let attempt = 0; attempt <= RETRY_ON_429; attempt++) {
      try {
        if (attempt > 0) {
          process.stdout.write(`retry ${attempt} ... `);
          await sleep(RETRY_WAIT_MS);
        }
        const buf = await getWithRedirects(url);
        if (buf.length < 400) {
          console.log('too small, skip');
          break;
        }
        fs.writeFileSync(dest, buf);
        console.log(`${buf.length} B`);
        break;
      } catch (e) {
        const msg = e && typeof e === 'object' && 'message' in e ? e.message : String(e);
        if (e && typeof e === 'object' && e.code429 && attempt < RETRY_ON_429) {
          continue;
        }
        console.log(msg);
        break;
      }
    }
    await sleep(DELAY_MS);
  }
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
