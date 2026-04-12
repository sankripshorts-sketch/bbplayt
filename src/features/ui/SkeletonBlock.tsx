import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ColorPalette } from '../../theme/palettes';

export function SkeletonBlock({
  height,
  colors,
  style,
}: {
  height: number;
  colors: ColorPalette;
  style?: object;
}) {
  return <View style={[styles.block, { height, backgroundColor: colors.border }, style]} />;
}

const styles = StyleSheet.create({
  block: {
    borderRadius: 12,
    opacity: 0.45,
  },
});
