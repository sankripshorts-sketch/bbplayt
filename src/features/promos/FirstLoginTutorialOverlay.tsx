import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import { fonts, useThemeColors } from '../../theme';
import type { ColorPalette } from '../../theme/palettes';
import { CenteredCardModal } from './CenteredCardModal';
import { loadAppPreferences, patchAppPreferences } from '../../preferences/appPreferences';

type Props = {
  onDone?: () => void;
};

type TutorialStep = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  titleKey:
    | 'tutorial.step.booking.title'
    | 'tutorial.step.food.title'
    | 'tutorial.step.news.title'
    | 'tutorial.step.help.title';
  bodyKey:
    | 'tutorial.step.booking.body'
    | 'tutorial.step.food.body'
    | 'tutorial.step.news.body'
    | 'tutorial.step.help.body';
};

const steps: TutorialStep[] = [
  {
    icon: 'calendar-clock',
    titleKey: 'tutorial.step.booking.title',
    bodyKey: 'tutorial.step.booking.body',
  },
  {
    icon: 'silverware-fork-knife',
    titleKey: 'tutorial.step.food.title',
    bodyKey: 'tutorial.step.food.body',
  },
  {
    icon: 'newspaper-variant-outline',
    titleKey: 'tutorial.step.news.title',
    bodyKey: 'tutorial.step.news.body',
  },
  {
    icon: 'chat-question-outline',
    titleKey: 'tutorial.step.help.title',
    bodyKey: 'tutorial.step.help.body',
  },
];

export function FirstLoginTutorialOverlay({ onDone }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [gate, setGate] = useState<'loading' | 'show' | 'hidden'>('loading');
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancel = false;
    void loadAppPreferences().then((p) => {
      if (cancel) return;
      if (p.appTutorialSeen) {
        setGate('hidden');
        onDone?.();
        return;
      }
      setGate('show');
    });
    return () => {
      cancel = true;
    };
  }, [onDone]);

  useEffect(() => {
    if (gate !== 'show') return;
    appear.setValue(0);
    Animated.timing(appear, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [appear, gate]);

  const markDone = useCallback(() => {
    void patchAppPreferences({ appTutorialSeen: true });
    setGate('hidden');
    onDone?.();
  }, [onDone]);

  if (gate === 'loading' || gate === 'hidden') return null;

  return (
    <CenteredCardModal visible title={t('tutorial.title')} onClose={markDone}>
      <Animated.View
        style={[
          styles.root,
          {
            opacity: appear,
            transform: [
              {
                translateY: appear.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.subtitle}>{t('tutorial.subtitle')}</Text>
        <View style={styles.list}>
          {steps.map((step) => (
            <View key={step.titleKey} style={styles.row}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={step.icon} size={20} color={colors.accentBright} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.stepTitle}>{t(step.titleKey)}</Text>
                <Text style={styles.stepBody}>{t(step.bodyKey)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={markDone} style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}>
            <Text style={styles.skipText}>{t('tutorial.skip')}</Text>
          </Pressable>
          <Pressable onPress={markDone} style={({ pressed }) => [styles.nextBtn, pressed && styles.pressed]}>
            <Text style={styles.nextText}>{t('tutorial.finish')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </CenteredCardModal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: {
      gap: 14,
      paddingTop: 4,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    list: {
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: colors.card,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.chipOn,
      borderColor: colors.borderLight,
      borderWidth: 1,
    },
    rowBody: {
      flex: 1,
      gap: 3,
      minHeight: 0,
    },
    stepTitle: {
      fontFamily: fonts.semibold,
      color: colors.text,
      fontSize: 15,
      lineHeight: 20,
    },
    stepBody: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    skipBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipText: {
      color: colors.text,
      fontFamily: fonts.semibold,
      fontSize: 15,
    },
    nextBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextText: {
      color: colors.accentTextOnButton,
      fontFamily: fonts.semibold,
      fontSize: 15,
    },
    pressed: {
      opacity: 0.9,
    },
  });
}
