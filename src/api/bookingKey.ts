import * as Crypto from 'expo-crypto';

/**
 * Подпись для POST /booking (поле key — MD5).
 * Если на сервере другая формула, задайте EXPO_PUBLIC_BOOKING_SIGN_SECRET
 * (тогда key = MD5(rand_key + secret)).
 * Иначе используется конкатенация полей брони (подберите под ваш бэкенд при необходимости).
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
}): Promise<string> {
  const secret = process.env.EXPO_PUBLIC_BOOKING_SIGN_SECRET ?? '';
  const payload = secret
    ? `${params.randKey}${secret}`
    : `${params.randKey}|${params.memberId}|${params.memberAccount}|${params.icafeId}|${params.pcName}|${params.startDate}|${params.startTime}|${params.mins}`;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, payload);
}
