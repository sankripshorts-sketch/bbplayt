import { md5HexUtf8 } from './md5Utf8';

/**
 * Подпись для POST /verify (SMS). Как в референсном Android:
 * MD5(memberId + randKey + privateKey + secret)
 */
export async function buildVerifySmsKey(params: {
  memberId: string;
  randKey: string;
  privateKey: string;
}): Promise<string> {
  const secret = process.env.EXPO_PUBLIC_VERIFY_SIGN_SECRET ?? '';
  const payload = `${params.memberId}${params.randKey}${params.privateKey}${secret}`;
  return md5HexUtf8(payload);
}

export function randomNumericKey(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1e9)}`;
}
