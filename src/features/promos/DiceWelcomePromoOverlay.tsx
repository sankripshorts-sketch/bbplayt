import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import { loadAppPreferences, patchAppPreferences } from '../../preferences/appPreferences';
import { navigationRef } from '../../navigation/navigationRef';
import { fonts, useThemeColors } from '../../theme';
import type { ColorPalette } from '../../theme/palettes';
import { CenteredCardModal } from './CenteredCardModal';
import { usePromoModalBodyHeight } from './usePromoModalMinBodyHeight';

const DICE_5 = require('../../../assets/promos/dice/dice-5.png');

/**
 * Первый заход после входа: карточка как у остальных акций (CenteredCardModal).
 * Повторно не показывается после `diceWelcomePromoSeen` в appPreferences.
 */
export function DiceWelcomePromoOverlay() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const bodyHeight = usePromoModalBodyHeight();
  const { height: winH } = useWindowDimensions();
  const [gate, setGate] = useState<'loading' | 'show' | 'hidden'>('loading');
  const styles = useMemo(
    () => createStyles(colors, bodyHeight, winH),
    [colors, bodyHeight, winH],
  );

  useEffect(() => {
    let cancel = false;
    void loadAppPreferences().then((p) => {
      if (cancel) return;
      setGate(p.diceWelcomePromoSeen ? 'hidden' : 'show');
    });
    return () => {
      cancel = true;
    };
  }, []);

  const markSeen = useCallback(() => {
    void patchAppPreferences({ diceWelcomePromoSeen: true });
  }, []);

  const onDismiss = useCallback(() => {
    markSeen();
    setGate('hidden');
  }, [markSeen]);

  const onPlay = useCallback(() => {
    markSeen();
    setGate('hidden');
    requestAnimationFrame(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Profile', {
          screen: 'ProfileHome',
          params: { openDice: true },
        });
      }
    });
  }, [markSeen]);

  if (gate === 'loading' || gate === 'hidden') {
    return null;
  }

  return (
    <CenteredCardModal
      visible
      title={t('promo.diceTitle')}
      onClose={onDismiss}
      noScroll
      bodyHeight={bodyHeight}
    >
      <View style={styles.bodyRoot}>
        {/* Верх/низ: лёгкий сдвиг к «оптическому» центру: основной текст ближе к зоне, куда смотрят в первую очередь */}
        <View style={styles.focalColumn}>
          <View style={styles.focalSpacerTop} />
          <View style={styles.focalBlock}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="seal" size={14} color={colors.accentBright} />
              <Text style={styles.badgeText}>{t('promo.diceWelcomeBadge')}</Text>
            </View>
            <Text style={styles.lead} accessibilityRole="text">
              {t('promo.diceWelcomeBody')}
            </Text>
            <View style={styles.diceWrap}>
              <Image
                source={DICE_5}
                accessibilityIgnoresInvertColors
                style={[styles.diceImg, { transform: [{ rotate: '-8deg' }] }]}
                resizeMode="contain"
              />
            </View>
          </View>
          <View style={styles.focalSpacerBottom} />
        </View>

        <View style={styles.btnColumn}>
          <Pressable
            onPress={onPlay}
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('promo.diceWelcomePlay')}
          >
            <MaterialCommunityIcons
              name="dice-multiple"
              size={22}
              color={colors.accentTextOnButton}
            />
            <Text style={styles.btnPrimaryText}>{t('promo.diceWelcomePlay')}</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('promo.diceWelcomeDismiss')}
          >
            <Text style={styles.btnSecondaryText}>{t('promo.diceWelcomeDismiss')}</Text>
          </Pressable>
        </View>
      </View>
    </CenteredCardModal>
  );
}

function createStyles(colors: ColorPalette, bodyHeight: number, winH: number) {
  /**
   * Верх/низ: меньше пустоты сверху, больше снизу — блок с текстом визуально выше,
   * ближе к типичной зоне внимания (верхняя/центральная часть карточки).
   */
  const topFlex = 0.2;
  /** Меньше — кнопки ближе к тексту/кубику, без пустоты по центру */
  const bottomFlex = 0.08;
  return StyleSheet.create({
    bodyRoot: {
      flex: 1,
      minHeight: 0,
      width: '100%',
    },
    focalColumn: {
      flex: 1,
      minHeight: 0,
      width: '100%',
      flexDirection: 'column',
    },
    focalSpacerTop: {
      flex: topFlex,
      minHeight: 0,
    },
    focalSpacerBottom: {
      flex: bottomFlex,
      minHeight: 0,
    },
    focalBlock: {
      width: '100%',
      alignItems: 'center',
      paddingHorizontal: 2,
      /** На очень низких окнах не сжимать читабельность */
      maxWidth: 520,
      alignSelf: 'center',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.chipOn,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    badgeText: {
      color: colors.accentBright,
      fontFamily: fonts.semibold,
      fontSize: 12,
      letterSpacing: 0.3,
    },
    lead: {
      textAlign: 'center',
      color: colors.text,
      fontFamily: fonts.semibold,
      fontSize: Math.min(19, 16 + (winH > 700 ? 1 : 0)),
      lineHeight: 26,
      letterSpacing: 0.15,
    },
    diceWrap: {
      marginTop: 14,
      width: '100%',
      alignItems: 'center',
    },
    diceImg: {
      width: Math.min(120, bodyHeight * 0.24),
      height: Math.min(120, bodyHeight * 0.24),
    },
    btnColumn: {
      flexShrink: 0,
      width: '100%',
      paddingTop: 0,
      gap: 10,
    },
    btnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.accent,
    },
    btnSecondary: {
      paddingVertical: 13,
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    pressed: { opacity: 0.9 },
    btnPrimaryText: {
      color: colors.accentTextOnButton,
      fontFamily: fonts.semibold,
      fontSize: 16,
    },
    btnSecondaryText: {
      color: colors.text,
      fontFamily: fonts.semibold,
      fontSize: 15,
    },
  });
}
