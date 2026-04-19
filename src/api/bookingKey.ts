import { md5HexUtf8 } from './md5Utf8';
import { getBookingKeyMode } from '../config/bookingSignConfig';
import { getContestSignSecret } from '../config/contestSignSecret';

/**
 * Подпись для POST /booking (поле key — MD5).
 * Режимы: `EXPO_PUBLIC_BOOKING_KEY_MODE` — см. `bookingSignConfig.ts`.
 * По умолчанию **android**: MD5(memberId + randKey + privateKey + secret) как реф. Android и `scripts/verify-booking-e2e.mjs`.
 * Секрет: `getContestSignSecret()` (env или `app.config.js` → contestSignSecret).
 */
export async function buildBookingKey(params: {
  randKey: string;
  memberId: string;
  memberAccount: string;
  icafeId: number;
  pcName: string;
  startDate: string;
  startTime: string;
  mins: number;
  privateKey?: string;
}): Promise<string> {
  const mode = getBookingKeyMode();
  const secret = getContestSignSecret();

  if (mode === 'android') {
    const pk = params.privateKey?.trim() ?? '';
    const payload = `${params.memberId}${params.randKey}${pk}${secret}`;
    return md5HexUtf8(payload);
  }

  if (mode === 'rand_secret') {
    const payload = `${params.randKey}${secret}`;
    return md5HexUtf8(payload);
  }

  /* legacy_concat */
  const payload = secret
    ? `${params.randKey}${secret}`
    : `${params.randKey}|${params.memberId}|${params.memberAccount}|${params.icafeId}|${params.pcName}|${params.startDate}|${params.startTime}|${params.mins}`;
  return md5HexUtf8(payload);
}

/**
 * Подпись для POST /booking-cancel (поле key — MD5).
 * Режим **`EXPO_PUBLIC_BOOKING_KEY_MODE`** должен совпадать с проверкой на шлюзе (как для POST /booking):
 * - **android** — `MD5(memberId + randKey + privateKey + secret)` (как `buildBookingKey`);
 * - **rand_secret** / **legacy_concat** с секретом — `MD5(rand_key + secret)`;
 * - **legacy_concat** без секрета — строка с суффиксом `|cancel`.
 */
export async function buildCancelBookingKey(params: {
  randKey: string;
  memberId: string;
  memberAccount: string;
  icafeId: number;
  pcName: string;
  memberOfferId: number;
  privateKey?: string;
}): Promise<string> {
  const mode = getBookingKeyMode();
  const secret = getContestSignSecret();

  if (mode === 'android') {
    const pk = params.privateKey?.trim() ?? '';
    const payload = `${params.memberId}${params.randKey}${pk}${secret}`;
    return md5HexUtf8(payload);
  }

  if (mode === 'rand_secret') {
    const payload = `${params.randKey}${secret}`;
    return md5HexUtf8(payload);
  }

  /* legacy_concat */
  const payload = secret
    ? `${params.randKey}${secret}`
    : `${params.randKey}|${params.memberId}|${params.memberAccount}|${params.icafeId}|${params.pcName}|${params.memberOfferId}|cancel`;
  return md5HexUtf8(payload);
}
