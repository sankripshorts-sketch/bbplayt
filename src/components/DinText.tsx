import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { normalizeDinTextStyle } from '../theme/normalizeDinTextStyle';

/** Text с корректным начертанием DIN Round Pro при использовании `fontWeight` в стилях. */
export const Text = React.forwardRef<RNText, TextProps>(function DinText(props, ref) {
  return <RNText {...props} ref={ref} style={normalizeDinTextStyle(props.style)} />;
});
