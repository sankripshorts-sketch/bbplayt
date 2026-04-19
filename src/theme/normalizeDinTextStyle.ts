import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { fonts } from './appFonts';

const DIN_FAMILY_VALUES = new Set<string>(Object.values(fonts));

/**
 * Для кастомных OTF в RN нельзя полагаться на `fontWeight`: нужно явное `fontFamily`.
 * Переводит вес в нужный файл DIN Round Pro (как в нативном BBPlay).
 */
export function mapFontWeightToDinFamily(
  weight: NonNullable<TextStyle['fontWeight']>,
): string {
  const w = String(weight);
  if (w === '100' || w === '200' || w === '300' || w === 'light') return fonts.light;
  if (w === '400' || w === 'normal') return fonts.regular;
  if (w === '500' || w === 'medium') return fonts.medium;
  if (w === '600' || w === 'semibold') return fonts.semibold;
  if (w === '700' || w === 'bold') return fonts.bold;
  if (w === '800' || w === '900' || w === 'black') return fonts.black;
  return fonts.medium;
}

export function normalizeDinTextStyle(
  style: StyleProp<TextStyle> | undefined | null,
): StyleProp<TextStyle> | undefined {
  if (style == null || style === false) return style ?? undefined;
  const flat = StyleSheet.flatten(style) as TextStyle;
  if (flat.fontWeight == null) return style;

  if (flat.fontFamily != null && !DIN_FAMILY_VALUES.has(flat.fontFamily)) {
    return style;
  }

  const fontFamily = mapFontWeightToDinFamily(flat.fontWeight);
  const { fontWeight: _omit, ...rest } = flat;
  return { ...rest, fontFamily } as TextStyle;
}
