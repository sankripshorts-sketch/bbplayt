/**
 * Режим MD5 для POST /booking (поле `key`).
 * Задаётся EXPO_PUBLIC_BOOKING_KEY_MODE — без «угадывания» по наличию privateKey.
 *
 * - android — как реф. APK: MD5(memberId + randKey + privateKey + secret)
 * - rand_secret — MD5(randKey + secret) (альтернатива в docs/api-spec.md)
 * - legacy_concat — устаревший MD5 от полей брони (без секрета)
 */
export type BookingKeyMode = 'android' | 'rand_secret' | 'legacy_concat';

export function getBookingKeyMode(): BookingKeyMode {
  const raw = process.env.EXPO_PUBLIC_BOOKING_KEY_MODE?.trim().toLowerCase();
  if (raw === 'rand_secret' || raw === 'rand-secret') return 'rand_secret';
  if (raw === 'legacy' || raw === 'legacy_concat') return 'legacy_concat';
  return 'android';
}

/** Для UI: подпись готова к отправке при текущем режиме. */
export function bookingSignReady(params: {
  mode: BookingKeyMode;
  hasSecret: boolean;
  hasPrivateKey: boolean;
}): boolean {
  const { mode, hasSecret, hasPrivateKey } = params;
  if (mode === 'android') return hasSecret && hasPrivateKey;
  if (mode === 'rand_secret') return hasSecret;
  return true;
}
