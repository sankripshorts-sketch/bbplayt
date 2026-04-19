import { Platform } from 'react-native';
import md5 from 'md5';

/**
 * MD5 строки в hex (как `expo-crypto` для подписей).
 * На web статический import `expo-crypto` ломает бандл (`requireNativeModule`).
 */
export async function md5HexUtf8(payload: string): Promise<string> {
  if (Platform.OS === 'web') {
    return md5(payload);
  }
  const Crypto = await import('expo-crypto');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, payload);
}
