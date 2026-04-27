import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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

type FeatureStep = {
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

const FEATURE_STEPS: FeatureStep[] = [
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

/** intro (0) + 4 feature slides + quiz (5) */
const PAGE_COUNT = 1 + FEATURE_STEPS.length + 1;
const PAGER_MIN_HEIGHT = 268;

type QuizId = 'booking' | 'food' | 'help';

export function FirstLoginTutorialOverlay({ onDone }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { width: winW } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [gate, setGate] = useState<'loading' | 'show' | 'hidden'>('loading');
  const appear = useRef(new Animated.Value(0)).current;
  const hScrollRef = useRef<ScrollView>(null);

  const estimatedSlideW = Math.max(280, Math.round(winW - 32 - 36));
  const [slideW, setSlideW] = useState(estimatedSlideW);
  const [page, setPage] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [quizWrongId, setQuizWrongId] = useState<QuizId | null>(null);
  const shake = useRef(new Animated.Value(0)).current;

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

  const modalTitle = useMemo(() => {
    if (page === 0) return t('tutorial.title');
    if (page >= 1 && page <= FEATURE_STEPS.length) {
      return t(FEATURE_STEPS[page - 1]!.titleKey);
    }
    return t('tutorial.check.title');
  }, [page, t]);

  const runShake = useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  const onQuizPick = useCallback(
    (id: QuizId) => {
      if (id === 'booking') {
        setQuizCorrect(true);
        setQuizWrongId(null);
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return;
      }
      setQuizCorrect(false);
      setQuizWrongId(id);
      runShake();
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [runShake],
  );

  const scrollToPage = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(PAGE_COUNT - 1, next));
      if (slideW > 0) {
        hScrollRef.current?.scrollTo({ x: clamped * slideW, animated: true });
      }
      setPage(clamped);
    },
    [slideW],
  );

  const onPagerLayout = useCallback((w: number) => {
    if (w <= 0) return;
    setSlideW((prev) => (Math.abs(prev - w) < 2 ? prev : w));
  }, []);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = slideW > 0 ? Math.round(x / slideW) : 0;
    const clamped = Math.max(0, Math.min(PAGE_COUNT - 1, next));
    setPage(clamped);
  }, [slideW]);

  const syncedSlideWRef = useRef(-1);
  useEffect(() => {
    if (slideW <= 0) return;
    if (syncedSlideWRef.current === slideW) return;
    syncedSlideWRef.current = slideW;
    hScrollRef.current?.scrollTo({ x: page * slideW, animated: false });
  }, [slideW, page]);

  const goNext = useCallback(() => {
    if (page === PAGE_COUNT - 1) {
      if (quizCorrect) markDone();
      return;
    }
    scrollToPage(page + 1);
  }, [markDone, page, quizCorrect, scrollToPage]);

  const goBack = useCallback(() => {
    if (page <= 0) return;
    scrollToPage(page - 1);
  }, [page, scrollToPage]);

  const onDotPress = useCallback(
    (i: number) => {
      scrollToPage(i);
    },
    [scrollToPage],
  );

  if (gate === 'loading' || gate === 'hidden') return null;

  const isLast = page === PAGE_COUNT - 1;
  const primaryLabel = isLast ? t('tutorial.finish') : t('tutorial.next');
  const primaryDisabled = isLast && !quizCorrect;

  return (
    <CenteredCardModal visible title={modalTitle} onClose={markDone}>
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
        <View style={styles.topMeta}>
          <Text style={styles.progress}>
            {t('tutorial.progress', { current: page + 1, total: PAGE_COUNT })}
          </Text>
          {page === 0 ? <Text style={styles.pagerHint}>{t('tutorial.pagerHint')}</Text> : null}
        </View>

        <View
          style={styles.pagerClip}
          onLayout={(e) => onPagerLayout(e.nativeEvent.layout.width)}
        >
          <ScrollView
            ref={hScrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={onMomentumEnd}
            style={[styles.hScroll, { height: PAGER_MIN_HEIGHT }]}
            contentContainerStyle={slideW > 0 ? { width: slideW * PAGE_COUNT } : undefined}
          >
            {/* Intro */}
            <View style={[styles.page, slideW > 0 ? { width: slideW } : { minWidth: estimatedSlideW }]}>
              <View style={styles.introHero}>
                <MaterialCommunityIcons name="gesture-swipe-horizontal" size={40} color={colors.accentBright} />
              </View>
              <Text style={styles.introTitle}>{t('tutorial.intro.title')}</Text>
              <Text style={styles.subtitle}>{t('tutorial.intro.body')}</Text>
              <Text style={styles.subtitleMuted}>{t('tutorial.subtitle')}</Text>
            </View>

            {FEATURE_STEPS.map((step) => (
              <View
                key={step.titleKey}
                style={[styles.page, slideW > 0 ? { width: slideW } : { minWidth: estimatedSlideW }]}
              >
                <View style={styles.featureIconWrap}>
                  <MaterialCommunityIcons name={step.icon} size={36} color={colors.accentBright} />
                </View>
                <Text style={styles.stepTitle}>{t(step.titleKey)}</Text>
                <Text style={styles.stepBody}>{t(step.bodyKey)}</Text>
              </View>
            ))}

            {/* Quiz */}
            <View style={[styles.page, slideW > 0 ? { width: slideW } : { minWidth: estimatedSlideW }]}>
              <Text style={styles.quizPrompt}>{t('tutorial.check.prompt')}</Text>
              <View style={styles.quizChips}>
                {(
                  [
                    { id: 'booking' as const, tabKey: 'tabs.booking' as const },
                    { id: 'food' as const, tabKey: 'tabs.food' as const },
                    { id: 'help' as const, tabKey: 'tabs.help' as const },
                  ] as const
                ).map(({ id, tabKey }) => {
                  const pickedWrong = quizWrongId === id;
                  const pickedRight = quizCorrect && id === 'booking';
                  return (
                    <Pressable
                      key={id}
                      onPress={() => onQuizPick(id)}
                      style={({ pressed }) => [
                        styles.quizChip,
                        pickedRight && styles.quizChipRight,
                        pickedWrong && styles.quizChipWrong,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: pickedRight || pickedWrong }}
                    >
                      <MaterialCommunityIcons
                        name={id === 'booking' ? 'calendar-clock' : id === 'food' ? 'silverware-fork-knife' : 'chat-question-outline'}
                        size={20}
                        color={pickedRight ? colors.accentTextOnButton : pickedWrong ? colors.danger : colors.text}
                      />
                      <Text
                        style={[
                          styles.quizChipText,
                          pickedRight && styles.quizChipTextOnAccent,
                          pickedWrong && styles.quizChipTextDanger,
                        ]}
                      >
                        {t(tabKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {quizWrongId && !quizCorrect ? (
                <Text style={styles.quizFeedbackWrong}>{t('tutorial.check.wrong')}</Text>
              ) : null}
              {quizCorrect ? <Text style={styles.quizFeedbackOk}>{t('tutorial.check.correct')}</Text> : null}
            </View>
          </ScrollView>
        </View>

        <View style={styles.dotsRow} accessibilityRole="tablist">
          {Array.from({ length: PAGE_COUNT }, (_, i) => (
            <Pressable
              key={i}
              onPress={() => onDotPress(i)}
              style={styles.dotHit}
              accessibilityRole="button"
              accessibilityLabel={t('tutorial.progress', { current: i + 1, total: PAGE_COUNT })}
              accessibilityState={{ selected: page === i }}
            >
              <View style={[styles.dot, i === page && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={goBack}
            disabled={page === 0}
            style={({ pressed }) => [
              styles.secondaryBtn,
              page === 0 && styles.secondaryBtnDisabled,
              pressed && page > 0 && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryBtnText, page === 0 && styles.secondaryBtnTextDisabled]}>
              {t('tutorial.back')}
            </Text>
          </Pressable>
          <Pressable onPress={markDone} style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}>
            <Text style={styles.skipText}>{t('tutorial.skip')}</Text>
          </Pressable>
          <Pressable
            onPress={goNext}
            disabled={primaryDisabled}
            style={({ pressed }) => [
              styles.nextBtn,
              primaryDisabled && styles.nextBtnDisabled,
              pressed && !primaryDisabled && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: primaryDisabled }}
          >
            <Text
              style={[styles.nextText, primaryDisabled && styles.nextTextDisabled]}
              numberOfLines={2}
            >
              {primaryDisabled ? t('tutorial.check.ctaLocked') : primaryLabel}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </CenteredCardModal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: {
      gap: 12,
      paddingTop: 4,
    },
    topMeta: {
      gap: 4,
    },
    progress: {
      fontFamily: fonts.semibold,
      color: colors.muted,
      fontSize: 13,
      letterSpacing: 0.2,
    },
    pagerHint: {
      color: colors.accentBright,
      fontSize: 13,
      lineHeight: 18,
    },
    pagerClip: {
      width: '100%',
      overflow: 'hidden',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    hScroll: {
      width: '100%',
    },
    page: {
      paddingHorizontal: 16,
      paddingVertical: 18,
      justifyContent: 'flex-start',
      gap: 10,
    },
    introHero: {
      width: 72,
      height: 72,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      backgroundColor: colors.chipOn,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: 4,
    },
    introTitle: {
      fontFamily: fonts.semibold,
      color: colors.text,
      fontSize: 18,
      lineHeight: 24,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    subtitleMuted: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    featureIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      backgroundColor: colors.chipOn,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: 4,
    },
    stepTitle: {
      fontFamily: fonts.semibold,
      color: colors.text,
      fontSize: 17,
      lineHeight: 22,
      textAlign: 'center',
    },
    stepBody: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    quizPrompt: {
      fontFamily: fonts.semibold,
      color: colors.text,
      fontSize: 16,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 4,
    },
    quizChips: {
      gap: 10,
      marginTop: 4,
    },
    quizChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardElevated,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    quizChipRight: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    quizChipWrong: {
      borderColor: colors.danger,
      backgroundColor: colors.card,
    },
    quizChipText: {
      fontFamily: fonts.semibold,
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    quizChipTextOnAccent: {
      color: colors.accentTextOnButton,
    },
    quizChipTextDanger: {
      color: colors.danger,
    },
    quizFeedbackWrong: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 4,
    },
    quizFeedbackOk: {
      color: colors.accentBright,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 4,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    dotHit: {
      padding: 6,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: {
      backgroundColor: colors.accentBright,
      width: 18,
      borderRadius: 4,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    secondaryBtn: {
      minHeight: 48,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryBtnDisabled: {
      opacity: 0.45,
    },
    secondaryBtnText: {
      color: colors.text,
      fontFamily: fonts.semibold,
      fontSize: 14,
    },
    secondaryBtnTextDisabled: {
      color: colors.muted,
    },
    skipBtn: {
      minHeight: 48,
      paddingHorizontal: 12,
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
      fontSize: 14,
    },
    nextBtn: {
      flex: 1,
      flexBasis: 120,
      minHeight: 48,
      minWidth: 100,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextBtnDisabled: {
      backgroundColor: colors.border,
    },
    nextText: {
      color: colors.accentTextOnButton,
      fontFamily: fonts.semibold,
      fontSize: 14,
      textAlign: 'center',
    },
    nextTextDisabled: {
      color: colors.muted,
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
