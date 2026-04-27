import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/messagesRu';
import { useThemeColors } from '../../theme';
import type { ColorPalette } from '../../theme/palettes';
import { CenteredCardModal } from './CenteredCardModal';
import type { PromoId } from './promoTypes';
import { PROMO_VISUAL, type PromoVisual } from './promoCatalog';

const BODY_KEYS: Record<Exclude<PromoId, 'dice'>, MessageKey> = {
  birthday: 'promo.birthdayBody',
  maps_review: 'promo.mapsBody',
};

type DetailPromoId = Exclude<PromoId, 'dice'>;

type Props = {
  visible: boolean;
  promoId: DetailPromoId | null;
  onClose: () => void;
};

function heroGradient(accent: PromoVisual['accent'], c: ColorPalette): [string, string] {
  if (accent === 'violet') {
    return [c.accentSecondary, '#3a0d40'];
  }
  if (accent === 'gold') {
    return [c.pcUnavailable, '#6b5a0f'];
  }
  return [c.accentBright, c.accentDark];
}

export function PromoDetailModal({ visible, promoId, onClose }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const show = !!(visible && promoId);
  const title = promoId ? t(PROMO_VISUAL[promoId].i18nTitle) : '';
  const body = promoId ? t(BODY_KEYS[promoId]) : '';
  const tagline = promoId ? t(PROMO_VISUAL[promoId].i18nCardLine) : '';
  const visual = promoId ? PROMO_VISUAL[promoId] : null;
  const paragraphs = useMemo(
    () => body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
    [body],
  );

  return (
    <CenteredCardModal visible={show} title={title} onClose={onClose}>
      {promoId && visual ? (
        <View style={styles.bodyWrap}>
          <View style={styles.bleed}>
            <LinearGradient
              colors={heroGradient(visual.accent, colors)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroIconRing}>
                <MaterialCommunityIcons
                  name={visual.icon as 'cake-variant'}
                  size={40}
                  color="rgba(255,255,255,0.96)"
                />
              </View>
              <Text style={styles.heroTagline} numberOfLines={2}>
                {tagline}
              </Text>
            </LinearGradient>
          </View>
          {paragraphs.map((block, i) => (
            <Text
              key={i}
              style={i === 0 ? styles.paraLead : styles.paraFoot}
            >
              {block}
            </Text>
          ))}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('promo.detailGotIt')}
          >
            <Text style={styles.ctaText}>{t('promo.detailGotIt')}</Text>
          </Pressable>
        </View>
      ) : null}
    </CenteredCardModal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    bodyWrap: { width: '100%' },
    bleed: {
      marginHorizontal: -18,
      marginTop: -2,
    },
    hero: {
      paddingTop: 20,
      paddingBottom: 18,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
    },
    heroIconRing: {
      width: 80,
      height: 80,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    heroTagline: {
      marginTop: 14,
      fontSize: 15,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.95)',
      textAlign: 'center',
      lineHeight: 20,
    },
    paraLead: {
      marginTop: 16,
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
    },
    paraFoot: {
      marginTop: 12,
      fontSize: 13,
      lineHeight: 20,
      color: colors.muted,
    },
    cta: {
      marginTop: 16,
      flexShrink: 0,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: 'center',
    },
    ctaPressed: { opacity: 0.9 },
    ctaText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.accentTextOnButton,
    },
  });
}
