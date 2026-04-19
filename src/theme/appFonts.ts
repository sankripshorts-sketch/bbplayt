import { useFonts } from 'expo-font';

/** Локальные OTF как в Android BBPlay (res/font/din_round_pro_*.otf). */
const dinRoundProFontAssets = {
  DINRoundPro_Light: require('../../assets/fonts/din_round_pro_light.otf'),
  DINRoundPro_Regular: require('../../assets/fonts/din_round_pro_regular.otf'),
  DINRoundPro_Medium: require('../../assets/fonts/din_round_pro_medium.otf'),
  DINRoundPro_Bold: require('../../assets/fonts/din_round_pro_bold.otf'),
  DINRoundPro_Black: require('../../assets/fonts/din_round_pro_black.otf'),
} as const;

/**
 * Имена после загрузки — совпадают с ключами в `dinRoundProFontAssets`.
 * Отдельного начертания semibold в наборе нет: для UI используем Medium.
 */
export const fonts = {
  light: 'DINRoundPro_Light',
  regular: 'DINRoundPro_Regular',
  medium: 'DINRoundPro_Medium',
  semibold: 'DINRoundPro_Medium',
  bold: 'DINRoundPro_Bold',
  black: 'DINRoundPro_Black',
} as const;

export function useAppFonts() {
  return useFonts(dinRoundProFontAssets);
}
