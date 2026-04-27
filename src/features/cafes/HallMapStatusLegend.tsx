import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import { useTheme } from '../../theme';
import { getHallPreviewTheme } from './hallMapPreviewTokens';

export type HallMapStatusLegendProps = {
  /** `embed` — под схемой в белой рамке (с разделителем). `booking` — сразу под картой на экране брони, без верхнего зазора. */
  variant?: 'embed' | 'booking';
};

export function HallMapStatusLegend({ variant = 'embed' }: HallMapStatusLegendProps) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const hallPreview = useMemo(() => getHallPreviewTheme(colors), [colors]);
  const styles = useMemo(
    () => createStyles(variant, colors.muted, hallPreview.legendSeparator),
    [variant, colors.muted, hallPreview.legendSeparator],
  );

  const items = useMemo(
    () =>
      [
        { key: 'busy', fill: colors.pcBusy, border: colors.pcBusy, label: t('hallMap.legendBusy') },
        {
          key: 'sel',
          fill: colors.pcSelected,
          border: colors.pcSelected,
          label: t('hallMap.legendSelected'),
        },
        {
          key: 'idle',
          fill: 'transparent',
          border: colors.pcFree,
          label: t('booking.legendFree'),
        },
        {
          key: 'un',
          fill: colors.pcUnavailable,
          border: colors.pcUnavailable,
          label: t('hallMap.legendUnavailable'),
        },
      ] as const,
    [t, colors.pcBusy, colors.pcSelected, colors.pcFree, colors.pcUnavailable],
  );

  return (
    <View style={styles.wrap}>
      {items.map((it) => (
        <View key={it.key} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: it.fill, borderColor: it.border }]} />
          <Text style={styles.label}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(variant: 'embed' | 'booking', labelColor: string, legendSeparator: string) {
  const booking = variant === 'booking';
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      rowGap: 8,
      columnGap: 14,
      marginTop: booking ? 8 : 10,
      paddingTop: booking ? 2 : 10,
      paddingBottom: booking ? 2 : 0,
      paddingHorizontal: booking ? 2 : 0,
      borderTopWidth: booking ? 0 : 1,
      borderTopColor: legendSeparator,
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    swatch: {
      width: 14,
      height: 14,
      borderRadius: 4,
      borderWidth: 2,
    },
    label: {
      fontSize: 12,
      color: labelColor,
    },
  });
}
