import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from './DinText';
import { fonts, useThemeColors } from '../theme';

/** Единый стиль для подписи «какой это экран» на всех вкладках. */
const TAB_SCREEN_TITLE_SIZE = 19;
const TAB_SCREEN_TITLE_LINE_HEIGHT = 24;
const TAB_SCREEN_BAR_MIN_HEIGHT = 36;
const TAB_SCREEN_SUBTITLE_SLOT_HEIGHT = 20;
const TAB_SCREEN_TOP_GAP = 6;

type Props = {
  title: string;
  /** Только на главном экране профиля — кнопка настроек справа, заголовок остаётся по центру полосы */
  rightAccessory?: React.ReactNode;
  /** Уменьшенный отступ снизу (компактный режим брони); размер заголовка тот же, что и на остальных вкладках */
  dense?: boolean;
  /** Вторая строка под заголовком, по центру */
  subtitle?: string;
  /** Горизонтальный отступ полосы; 0 — если родитель уже задаёт padding (ScrollView и т.п.) */
  horizontalPadding?: number;
};

/**
 * Название текущей вкладки по центру вверху; опционально слот справа (настройки только на профиле).
 */
export function TabScreenTopBar({
  title,
  rightAccessory,
  dense,
  subtitle,
  horizontalPadding = 0,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(
    () => createStyles(colors, !!dense, horizontalPadding, !!rightAccessory),
    [colors, dense, horizontalPadding, rightAccessory],
  );

  return (
    <View style={styles.outer}>
      <View style={styles.bar}>
        {/* Заголовок по центру всей полосы; иначе при rightAccessory он «уезжает» влево */}
        <View style={styles.titleLayer} pointerEvents="none">
          <Text
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
            accessibilityRole="header"
          >
            {title}
          </Text>
        </View>
        {rightAccessory ? (
          <View style={styles.rightRow}>
            <View style={styles.rightSlot}>{rightAccessory}</View>
          </View>
        ) : null}
      </View>
      <View style={styles.subtitleSlot}>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Одинаковый отступ слева и справа при иконке справа — иначе `textAlign: center` даёт смещение влево. */
const TITLE_LAYER_PAD_WITH_ACCESSORY = 48;

function createStyles(
  colors: { text: string; muted: string },
  dense: boolean,
  horizontalPadding: number,
  hasRightAccessory: boolean,
) {
  return StyleSheet.create({
    outer: {
      marginBottom: dense ? 4 : 6,
      paddingTop: TAB_SCREEN_TOP_GAP,
      paddingHorizontal: horizontalPadding,
      minHeight: TAB_SCREEN_BAR_MIN_HEIGHT + TAB_SCREEN_SUBTITLE_SLOT_HEIGHT + TAB_SCREEN_TOP_GAP,
    },
    bar: {
      minHeight: TAB_SCREEN_BAR_MIN_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    titleLayer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      paddingHorizontal: hasRightAccessory ? TITLE_LAYER_PAD_WITH_ACCESSORY : 4,
    },
    title: {
      fontSize: TAB_SCREEN_TITLE_SIZE,
      lineHeight: TAB_SCREEN_TITLE_LINE_HEIGHT,
      fontFamily: fonts.semibold,
      color: colors.text,
      textAlign: 'center',
      width: '100%',
      transform: [{ translateY: -2 }],
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    },
    rightRow: {
      flex: 1,
      minHeight: TAB_SCREEN_BAR_MIN_HEIGHT,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    subtitleSlot: {
      minHeight: TAB_SCREEN_SUBTITLE_SLOT_HEIGHT,
      justifyContent: 'flex-start',
    },
    subtitle: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 18,
    },
    rightSlot: {
      flexShrink: 0,
      justifyContent: 'center',
      marginLeft: 8,
    },
  });
}
