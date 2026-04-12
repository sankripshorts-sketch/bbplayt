import { Linking, Platform } from 'react-native';

function enc(s: string): string {
  return encodeURIComponent(s.trim());
}

/** Яндекс.Карты (HTTPS — откроет приложение или веб). */
export async function openYandexMapsForAddress(address: string): Promise<void> {
  const url = `https://yandex.ru/maps/?text=${enc(address)}`;
  await Linking.openURL(url);
}

export async function openGoogleMapsForAddress(address: string): Promise<void> {
  const url = `https://www.google.com/maps/search/?api=1&query=${enc(address)}`;
  await Linking.openURL(url);
}

/** Системные карты: Apple Maps на iOS, geo: на Android. */
export async function openSystemMapsForAddress(address: string): Promise<void> {
  const q = enc(address);
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?q=${q}`
      : `geo:0,0?q=${q}`;
  await Linking.openURL(url);
}

export async function dialPhone(phone: string): Promise<void> {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return;
  await Linking.openURL(`tel:${cleaned}`);
}

export async function openHttpUrl(url: string): Promise<void> {
  const u = url.startsWith('http') ? url : `https://${url.replace(/^\/\//, '')}`;
  await Linking.openURL(u);
}
