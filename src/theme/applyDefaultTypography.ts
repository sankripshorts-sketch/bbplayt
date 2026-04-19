import { Text, TextInput, type TextStyle } from 'react-native';
import { fonts } from './appFonts';

let applied = false;

type TextLike = {
  defaultProps?: { style?: TextStyle | TextStyle[] };
};

function mergeDefaultStyle(
  Component: typeof Text | typeof TextInput,
  base: TextStyle,
): void {
  const C = Component as unknown as TextLike;
  const prev = C.defaultProps?.style;
  C.defaultProps = {
    ...C.defaultProps,
    style:
      prev == null
        ? base
        : Array.isArray(prev)
          ? [base, ...prev]
          : [base, prev],
  };
}

/** Один раз после загрузки DIN Round Pro: базовый шрифт для Text и TextInput. */
export function applyDefaultTypography(): void {
  if (applied) return;
  applied = true;
  const base: TextStyle = { fontFamily: fonts.medium };
  mergeDefaultStyle(Text, base);
  mergeDefaultStyle(TextInput, base);
}
