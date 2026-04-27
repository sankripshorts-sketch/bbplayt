import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Макс. высота области с прокруткой; по умолчанию — почти весь экран, без искусственного потолка 800px */
  scrollMaxHeight?: number;
  /** Без ScrollView: контент фиксирован по высоте, без внутренней прокрутки (кубик и т.п.) */
  noScroll?: boolean;
  /** Фиксированная высота тела (px): одна для всех промо; min=max, без роста от контента */
  bodyHeight?: number;
};

/** Высота области с телом: почти весь экран (шапка модалки и отступы backdrop вычитаются), без капа 800px. */
function defaultBodyScrollMax(windowHeight: number, outerPadV: number, bottomPad: number) {
  const titleAndCardChrome = 58;
  const r = windowHeight - outerPadV - bottomPad - titleAndCardChrome;
  return Math.max(200, Math.min(4000, Math.round(r)));
}

/**
 * Затемнение фона, шириной под экран; тело с большой вёртикалью, чтобы не резать кубик и длинные тексты.
 */
export function CenteredCardModal({
  visible,
  title,
  onClose,
  children,
  scrollMaxHeight,
  noScroll,
  bodyHeight,
}: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const { t } = useLocale();
  const outerPadV = Math.max(16, Math.min(32, 10 + insets.top * 0.32));
  const bottomPad = Math.max(16, 6 + insets.bottom);
  const resolvedMax = scrollMaxHeight ?? defaultBodyScrollMax(winH, outerPadV, bottomPad);
  const styles = useMemo(
    () => createStyles(colors, outerPadV, bottomPad, resolvedMax, bodyHeight),
    [colors, outerPadV, bottomPad, resolvedMax, bodyHeight],
  );
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const canScroll = contentHeight > viewportHeight + 1;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
    >
      <View style={styles.backdrop} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('promo.closeSheet')} />
        <View style={[styles.sheetOuter, { pointerEvents: 'box-none' }]}>
          <View style={[styles.sheetShadow, { pointerEvents: 'box-none' }]}>
            <View style={styles.card}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.close')}
                >
                  <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
                </Pressable>
              </View>
              {noScroll ? (
                <View style={styles.bodyStatic}>{children}</View>
              ) : (
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={canScroll}
                  bounces={canScroll}
                  alwaysBounceVertical={false}
                  overScrollMode="never"
                  onLayout={(event) => {
                    const next = event.nativeEvent.layout.height;
                    if (next > 0) setViewportHeight(next);
                  }}
                  onContentSizeChange={(_, nextHeight) => {
                    if (nextHeight > 0) setContentHeight(nextHeight);
                  }}
                >
                  {children}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(
  colors: ColorPalette,
  outerPadV: number,
  bottomPad: number,
  scrollMax: number,
  bodyHeight?: number,
) {
  const fixedBody =
    bodyHeight != null
      ? {
          height: bodyHeight,
          minHeight: bodyHeight,
          maxHeight: bodyHeight,
        }
      : {};
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.58)',
      justifyContent: 'center',
      paddingTop: outerPadV,
      paddingBottom: bottomPad,
      /** Как `paddingHorizontal` на главном экране профиля (16) */
      paddingHorizontal: 16,
    },
    sheetOuter: { width: '100%', maxWidth: '100%' },
    sheetShadow: {
      width: '100%',
      maxWidth: '100%',
      alignSelf: 'center',
    },
    card: {
      backgroundColor: colors.cardElevated,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '96%',
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.35,
          shadowRadius: 20,
        },
        android: { elevation: 12 },
        web: { boxShadow: '0 12px 20px rgba(0,0,0,0.35)' },
        default: {},
      }),
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 8,
      gap: 12,
    },
    title: {
      flex: 1,
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 26,
    },
    closeBtn: { padding: 4, marginTop: -2 },
    scroll: { maxHeight: scrollMax, flexGrow: 0 },
    scrollContent: { paddingHorizontal: 18, paddingBottom: 20 + bottomPad },
    bodyStatic: {
      paddingHorizontal: 18,
      /** Симметрия с `titleRow.paddingTop`: отступ от края карточки к контенту */
      paddingBottom: 20 + bottomPad,
      flexGrow: 0,
      alignSelf: 'stretch',
      ...fixedBody,
    },
  });
}
