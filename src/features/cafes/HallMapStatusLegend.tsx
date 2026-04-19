import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import { HALL_PREVIEW } from './hallMapPreviewTokens';

export type HallMapStatusLegendProps = {
  /** `embed` — под схемой в белой рамке (с разделителем). `booking` — блок под картой на экране брони. */
  variant?: 'embed' | 'booking';
};

export function HallMapStatusLegend({ variant = 'embed' }: HallMapStatusLegendProps) {
  const { t } = useLocale();
  const styles = useMemo(() => createStyles(variant), [variant]);

  const frame = HALL_PREVIEW.chipIdleBorder;
  const items = useMemo(
    () =>
      [
        { key: 'busy', fill: HALL_PREVIEW.busy.fill, border: frame, label: t('hallMap.legendBusy') },
        {
          key: 'sel',
          fill: HALL_PREVIEW.selected.fill,
          border: frame,
          label: t('hallMap.legendSelected'),
        },
        {
          key: 'idle',
          fill: 'transparent',
          border: frame,
          label: t('hallMap.legendIdle'),
        },
        {
          key: 'un',
          fill: HALL_PREVIEW.unavail.fill,
          border: frame,
          label: t('hallMap.legendUnavailable'),
        },
      ] as const,
    [t],
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

function createStyles(variant: 'embed' | 'booking') {
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
      marginTop: booking ? 2 : 10,
      paddingTop: booking ? 4 : 10,
      paddingHorizontal: booking ? 2 : 0,
      borderTopWidth: booking ? 0 : 1,
      borderTopColor: HALL_PREVIEW.legendSeparator,
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
      color: '#9ca3af',
    },
  });
}
