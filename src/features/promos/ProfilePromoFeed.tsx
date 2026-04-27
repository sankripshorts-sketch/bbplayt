import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { PROMO_ORDER, PROMO_VISUAL, type PromoVisual } from './promoCatalog';
import type { PromoId } from './promoTypes';

/** Полный интервал до авто-прокрутки; сбрасывается на это же значение при любом касании/ручной прокрутке. */
const AUTO_MS = 10_000;

type Props = {
  onSelectPromo: (id: PromoId) => void;
  /** Не крутить карусель и не давать свайпать (например, пока открыта карточка акции или мини-игра). */
  paused?: boolean;
};

/**
 * Лента: [клон последней | …все n… | клон первой] — бесконечный цикл вправо и влево.
 * Физическая страница p ∈ [0, n+1]; логический индекс 0..n-1 на p = 1..n.
 */
function logicalFromPhysicalPage(p: number, n: number): number {
  if (n <= 1) return 0;
  const maxP = n + 1;
  const clamped = Math.min(maxP, Math.max(0, p));
  if (clamped <= 0) return n - 1;
  if (clamped >= n + 1) return 0;
  return clamped - 1;
}

function stripeColor(v: PromoVisual['accent'], c: ColorPalette): string {
  if (v === 'violet') return c.accentSecondary;
  if (v === 'gold') return c.pcUnavailable;
  return c.accentBright;
}

export function ProfilePromoFeed({ onSelectPromo, paused = false }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { width: windowW } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const n = PROMO_ORDER.length;
  const [pageW, setPageW] = useState(0);
  const contentW = pageW > 0 ? pageW : windowW;
  const pageWRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [autoCycleKey, setAutoCycleKey] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const indexRef = useRef(0);
  const lastScrollXRef = useRef(0);
  const loopNormalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const momentumActiveRef = useRef(false);
  const userScrollLock = useRef(false);
  const userDraggedRef = useRef(false);
  const [userDrivenDecel, setUserDrivenDecel] = useState(false);

  const scrollItems = useMemo(() => {
    if (n <= 1) return [...PROMO_ORDER];
    return [PROMO_ORDER[n - 1], ...PROMO_ORDER, PROMO_ORDER[0]];
  }, [n]);

  /** n+2 клона при n>1; иначе n */
  const numPages = scrollItems.length;

  const lastLayoutSyncedW = useRef(0);
  const lastSyncedN = useRef(n);
  const endNormalizeGuard = useRef(false);
  const startNormalizeGuard = useRef(false);
  /** Пока false — не нормализовать клоны (избегаем x=0 до первого scrollTo в ленте). */
  const carouselReadyRef = useRef(false);

  useEffect(() => {
    pageWRef.current = pageW;
  }, [pageW]);

  useEffect(() => {
    return () => {
      if (loopNormalizeTimerRef.current) {
        clearTimeout(loopNormalizeTimerRef.current);
        loopNormalizeTimerRef.current = null;
      }
    };
  }, []);

  const bumpAutoScrollTimer = useCallback(() => {
    setAutoCycleKey((k) => k + 1);
  }, []);

  const clearLoopNormalizeTimer = useCallback(() => {
    if (loopNormalizeTimerRef.current) {
      clearTimeout(loopNormalizeTimerRef.current);
      loopNormalizeTimerRef.current = null;
    }
  }, []);

  const scrollToXSync = useCallback((x: number) => {
    const sv = scrollRef.current;
    if (!sv) return;
    const apply = () => {
      sv.scrollTo({ x, y: 0, animated: false });
      lastScrollXRef.current = x;
    };
    apply();
    if (Platform.OS === 'android') {
      requestAnimationFrame(apply);
    }
    if (Platform.OS === 'web') {
      requestAnimationFrame(apply);
      requestAnimationFrame(() => requestAnimationFrame(apply));
    }
  }, []);

  /** Замыкающий клон первой акции: перескок на реальную первую страницу (offset = w). */
  const applyTrailingCloneNormalize = useCallback(() => {
    if (n <= 1) return;
    indexRef.current = 0;
    setIndex(0);
    requestAnimationFrame(() => {
      clearLoopNormalizeTimer();
      const wp = pageWRef.current;
      if (wp > 0) scrollToXSync(wp);
    });
  }, [n, clearLoopNormalizeTimer, scrollToXSync]);

  /** Ведущий клон последней акции: перескок на реальную последнюю (offset = n*w). */
  const applyLeadingCloneNormalize = useCallback(() => {
    if (n <= 1) return;
    indexRef.current = n - 1;
    setIndex(n - 1);
    requestAnimationFrame(() => {
      clearLoopNormalizeTimer();
      const wp = pageWRef.current;
      if (wp > 0) scrollToXSync(n * wp);
    });
  }, [n, clearLoopNormalizeTimer, scrollToXSync]);

  /**
   * Позиция на клоне: round(x/w) портит 3-й слайд, поэтому для web важен «упёрся в конец контента».
   */
  const isAtEndOfHScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (n <= 1) return false;
      const ne = e.nativeEvent as unknown as {
        contentOffset: { x: number };
        layoutMeasurement?: { width: number };
        contentSize?: { width: number };
      };
      const { contentOffset, layoutMeasurement, contentSize } = ne;
      if (!layoutMeasurement?.width || !contentSize?.width) return false;
      return contentOffset.x + layoutMeasurement.width >= contentSize.width - 1;
    },
    [n],
  );

  const isAtEndFromOffset = useCallback(
    (x: number) => {
      if (n <= 1 || pageW <= 0) return false;
      return x + pageW >= numPages * pageW - 1;
    },
    [n, numPages, pageW],
  );

  const isAtStartFromOffset = useCallback((x: number) => {
    if (n <= 1 || pageW <= 0) return false;
    return x <= 1;
  }, [n, pageW]);

  const scrollToLogical = useCallback(
    (logical: number, animated: boolean) => {
      const next = ((logical % n) + n) % n;
      const w = pageW > 0 ? pageW : windowW;
      if (n <= 1) {
        clearLoopNormalizeTimer();
        indexRef.current = 0;
        setIndex(0);
        scrollRef.current?.scrollTo({ x: 0, y: 0, animated });
        return;
      }
      if (w <= 0) return;
      clearLoopNormalizeTimer();
      const current = indexRef.current;
      const phys = (k: number) => (k + 1) * w;
      if (animated && current === n - 1 && next === 0) {
        indexRef.current = 0;
        setIndex(0);
        scrollRef.current?.scrollTo({ x: (n + 1) * w, y: 0, animated: true });
        loopNormalizeTimerRef.current = setTimeout(() => {
          loopNormalizeTimerRef.current = null;
          const wp = pageWRef.current;
          if (wp <= 0) return;
          const xx = lastScrollXRef.current;
          if (xx + wp >= (n + 2) * wp - 1) {
            indexRef.current = 0;
            setIndex(0);
            scrollToXSync(wp);
          }
        }, 450);
        return;
      }
      if (animated && current === 0 && next === n - 1) {
        indexRef.current = n - 1;
        setIndex(n - 1);
        scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
        loopNormalizeTimerRef.current = setTimeout(() => {
          loopNormalizeTimerRef.current = null;
          const wp = pageWRef.current;
          if (wp <= 0) return;
          const xx = lastScrollXRef.current;
          if (xx <= 1) {
            indexRef.current = n - 1;
            setIndex(n - 1);
            scrollToXSync(n * wp);
          }
        }, 450);
        return;
      }
      indexRef.current = next;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: phys(next), y: 0, animated });
    },
    [n, pageW, windowW, clearLoopNormalizeTimer, scrollToXSync],
  );

  useEffect(() => {
    if (pageW <= 0) return;
    const w = pageW;
    if (n <= 1) {
      carouselReadyRef.current = true;
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      lastLayoutSyncedW.current = w;
      lastSyncedN.current = n;
      return;
    }
    const nChanged = lastSyncedN.current !== n;
    lastSyncedN.current = n;
    if (!nChanged && lastLayoutSyncedW.current > 0 && Math.abs(w - lastLayoutSyncedW.current) < 0.5) {
      return;
    }
    lastLayoutSyncedW.current = w;
    const i = indexRef.current;
    scrollRef.current?.scrollTo({ x: (i + 1) * w, y: 0, animated: false });
    requestAnimationFrame(() => {
      carouselReadyRef.current = true;
    });
  }, [pageW, n]);

  useEffect(() => {
    const id = setInterval(() => {
      if (paused || userScrollLock.current || n <= 1) return;
      const i = indexRef.current;
      const next = (i + 1) % n;
      scrollToLogical(next, true);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [scrollToLogical, autoCycleKey, n, paused]);

  /** Сдвиг вправо, чтобы точка шла впереди/в такт визуалу, не с отставанием. */
  const DOT_LEAD = 0.65;

  const setDotFromOffset = useCallback(
    (x: number, viewportW: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(viewportW) || viewportW <= 0) return;
      const w = viewportW;
      const p = Math.min(Math.max(0, Math.floor((x + DOT_LEAD * w) / w)), n + 1);
      const logical = logicalFromPhysicalPage(p, n);
      indexRef.current = logical;
      setIndex(logical);
    },
    [n],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const ne = e.nativeEvent as unknown as { contentOffset: { x: number }; layoutMeasurement?: { width: number } };
      const x = ne.contentOffset.x;
      lastScrollXRef.current = x;
      const wMeas = ne.layoutMeasurement?.width;
      const vw = wMeas && wMeas > 0 ? wMeas : pageW;
      if (n > 1 && pageW > 0 && vw > 0) {
        setDotFromOffset(x, vw);
      } else if (n <= 1) {
        indexRef.current = 0;
        setIndex(0);
      }
      if (n <= 1) return;
      const w = pageW;
      if (w <= 0) return;
      if (!carouselReadyRef.current) return;
      const atEnd = isAtEndOfHScroll(e) || isAtEndFromOffset(x);
      const atStart = isAtStartFromOffset(x);
      if (atEnd) {
        if (!endNormalizeGuard.current) {
          endNormalizeGuard.current = true;
          applyTrailingCloneNormalize();
        }
      } else if (atStart) {
        if (!startNormalizeGuard.current) {
          startNormalizeGuard.current = true;
          applyLeadingCloneNormalize();
        }
      } else {
        endNormalizeGuard.current = false;
        startNormalizeGuard.current = false;
      }
    },
    [
      n,
      pageW,
      setDotFromOffset,
      isAtEndOfHScroll,
      isAtEndFromOffset,
      isAtStartFromOffset,
      applyTrailingCloneNormalize,
      applyLeadingCloneNormalize,
    ],
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (n <= 1) return;
      const w = pageW;
      if (w <= 0) return;
      const x = e.nativeEvent.contentOffset.x;
      const vx = (e.nativeEvent as { velocity?: { x?: number } }).velocity?.x;

      if (x + w >= numPages * w - 1) {
        applyTrailingCloneNormalize();
        return;
      }
      if (x <= 1) {
        applyLeadingCloneNormalize();
        return;
      }
      if (vx != null && Math.abs(vx) > 0.35) {
        return;
      }
      requestAnimationFrame(() => {
        if (momentumActiveRef.current) return;
        requestAnimationFrame(() => {
          if (momentumActiveRef.current) return;
          const x2 = lastScrollXRef.current;
          if (w > 0 && x2 + w >= numPages * w - 1) {
            applyTrailingCloneNormalize();
          } else if (w > 0 && x2 <= 1) {
            applyLeadingCloneNormalize();
          }
        });
      });
    },
    [n, numPages, pageW, scrollToXSync, applyTrailingCloneNormalize, applyLeadingCloneNormalize],
  );

  const onMomentumScrollBegin = useCallback(() => {
    momentumActiveRef.current = true;
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      momentumActiveRef.current = false;
      clearLoopNormalizeTimer();
      userScrollLock.current = false;
      userDraggedRef.current = false;
      setUserDrivenDecel(false);
      const ne = e.nativeEvent as unknown as { contentOffset: { x: number }; layoutMeasurement?: { width: number } };
      const x = ne.contentOffset.x;
      lastScrollXRef.current = x;
      if (n <= 1) return;
      const vw = ne.layoutMeasurement?.width;
      if (pageW > 0 && (vw == null || vw > 0)) {
        setDotFromOffset(x, vw && vw > 0 ? vw : pageW);
      }
      if (isAtEndOfHScroll(e) || isAtEndFromOffset(x)) {
        applyTrailingCloneNormalize();
      } else if (isAtStartFromOffset(x)) {
        applyLeadingCloneNormalize();
      }
    },
    [
      n,
      pageW,
      clearLoopNormalizeTimer,
      isAtEndOfHScroll,
      isAtEndFromOffset,
      isAtStartFromOffset,
      setDotFromOffset,
      applyTrailingCloneNormalize,
      applyLeadingCloneNormalize,
    ],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow} onTouchStart={bumpAutoScrollTimer}>
        <MaterialCommunityIcons name="brightness-percent" size={18} color={colors.accentBright} />
        <Text style={styles.label}>{t('promo.feedLabel')}</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.hScroll}
        horizontal
        pagingEnabled
        removeClippedSubviews={false}
        scrollEnabled={!paused}
        showsHorizontalScrollIndicator={false}
        decelerationRate={userDrivenDecel ? 'normal' : 'fast'}
        bounces
        {...Platform.select({ android: { overScrollMode: 'never' as const } })}
        contentContainerStyle={[
          styles.hContent,
          pageW > 0
            ? { minWidth: numPages * pageW, width: numPages * pageW }
            : null,
        ]}
        onLayout={(ev) => {
          const w = Math.round(ev.nativeEvent.layout.width);
          if (w > 0) setPageW((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
        }}
        onTouchStart={bumpAutoScrollTimer}
        onScroll={onScroll}
        scrollEventThrottle={1}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollBeginDrag={() => {
          bumpAutoScrollTimer();
          userDraggedRef.current = true;
          userScrollLock.current = true;
          setUserDrivenDecel(true);
        }}
      >
        {scrollItems.map((id, extIdx) => {
          const v = PROMO_VISUAL[id];
          const line = t(v.i18nTitle);
          const sub = t(v.i18nCardLine);
          const stripe = stripeColor(v.accent, colors);
          return (
            <Pressable
              key={n <= 1 ? id : `promo-${id}-${extIdx}`}
              onPressIn={() => {
                bumpAutoScrollTimer();
                userScrollLock.current = true;
              }}
              onPressOut={() => {
                if (!userDraggedRef.current) {
                  userScrollLock.current = false;
                }
              }}
              onPress={() => onSelectPromo(id)}
              style={({ pressed }) => [
                styles.card,
                {
                  width: contentW,
                  minWidth: contentW,
                  flexShrink: 0,
                  borderLeftColor: stripe,
                },
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${line}. ${sub}`}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconBlob, { backgroundColor: colors.chipOn }]}>
                  <MaterialCommunityIcons name={v.icon as 'cake-variant'} size={26} color={stripe} />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {line}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={2}>
                    {sub}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.dots} accessibilityElementsHidden>
        {PROMO_ORDER.map((id, i) => (
          <View
            key={id}
            style={[styles.dot, i === index && { backgroundColor: colors.accentBright, width: 18 }]}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: { marginTop: 4, marginBottom: 2 },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    hScroll: {
      width: '100%',
      ...Platform.select({
        web: { touchAction: 'pan-x' as const },
        default: {},
      }),
    },
    hContent: {
      paddingBottom: 6,
      flexDirection: 'row',
      flexWrap: 'nowrap',
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderLeftWidth: 4,
      paddingVertical: 18,
      paddingHorizontal: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
        },
        android: { elevation: 3 },
        web: { boxShadow: '0 4px 8px rgba(0,0,0,0.12)' },
        default: {},
      }),
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBlob: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTextCol: { flex: 1, minWidth: 0 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, lineHeight: 20 },
    cardSub: { marginTop: 4, fontSize: 12, lineHeight: 16, color: colors.muted },
    dots: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 4,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  });
}
