import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Audio, type AVPlaybackSource } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Text } from '../../components/DinText';
import type { ColorPalette } from '../../theme/palettes';
import { useTheme } from '../../theme';

/** Высота строки: две строки текста (длительность + «Выгоднее…») — 46 pt обрезали подпись на части устройств. */
export const WHEEL_ITEM_HEIGHT = 52;

/** Центральная строка крупнее; соседи — меньше и приглушённее; переход по дробному расстоянию до центра скролла. */
const WHEEL_SCALE_ACTIVE = 1.08;
const WHEEL_SCALE_NEIGHBOR = 0.88;
const WHEEL_SCALE_FAR = 0.82;
const WHEEL_OPACITY_NEIGHBOR = 0.62;
const WHEEL_OPACITY_FAR = 0.45;
const WHEEL_FEEDBACK_ENABLED = false;

function smoothstep01(t: number): number {
  'worklet';
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** `d` — расстояние от центра в долях строки (0 = в центре рамки, 1 = ровно на соседней). */
function wheelScaleForDistance(d: number): number {
  'worklet';
  if (d <= 1) {
    return WHEEL_SCALE_ACTIVE + (WHEEL_SCALE_NEIGHBOR - WHEEL_SCALE_ACTIVE) * smoothstep01(d);
  }
  if (d <= 2) {
    return WHEEL_SCALE_NEIGHBOR + (WHEEL_SCALE_FAR - WHEEL_SCALE_NEIGHBOR) * smoothstep01(d - 1);
  }
  return WHEEL_SCALE_FAR;
}

function wheelOpacityForDistance(d: number): number {
  'worklet';
  if (d <= 1) {
    return 1 + (WHEEL_OPACITY_NEIGHBOR - 1) * smoothstep01(d);
  }
  if (d <= 2) {
    return WHEEL_OPACITY_NEIGHBOR + (WHEEL_OPACITY_FAR - WHEEL_OPACITY_NEIGHBOR) * smoothstep01(d - 1);
  }
  return WHEEL_OPACITY_FAR;
}

/** Рамка выбора чуть меньше ячейки — меньше «зелёный кирпич». */
const HIGHLIGHT_INSET_Y = 3;
/** Горизонтальный отступ рамки от краёв колонки (согласован с padding строк). */
const HIGHLIGHT_INSET_X = 10;

/** Строка колеса: одна строка или основная + подпись (меньшим шрифтом). */
export type WheelPickerItem = string | { main: string; sub?: string };
const VISIBLE_ROWS = 3;
export const WHEEL_VIEWPORT_HEIGHT = WHEEL_ITEM_HEIGHT * VISIBLE_ROWS;
const PAD_Y = (WHEEL_VIEWPORT_HEIGHT - WHEEL_ITEM_HEIGHT) / 2;

/**
 * Ближайший индекс к шагу snap (0, H, 2H, …) — чтобы после отпускания всегда доскролливало в центр рамки.
 */
function nearestSnapIndex(y: number, length: number): number {
  'worklet';
  if (length <= 0) return 0;
  const idx = Math.round(y / WHEEL_ITEM_HEIGHT);
  return Math.min(length - 1, Math.max(0, idx));
}

function indexToScrollOffset(idx: number, length: number): number {
  const i = Math.max(0, Math.min(length - 1, idx));
  return i * WHEEL_ITEM_HEIGHT;
}

const WEB_WHEEL_TICK_MIN_GAP_MS = 42;
const WEB_WHEEL_TICK_GAIN = 0.024;
const WEB_WHEEL_TICK_DURATION_S = 0.018;
const NATIVE_WHEEL_TICK_MIN_GAP_MS = 55;
const WHEEL_TICK_SOUND: AVPlaybackSource = require('../../../assets/audio/wheel-tick.wav');
/** Допуски для "тапа по строке", когда RN отменяет onPress как скролл. */
const TAP_FALLBACK_MAX_TRAVEL_PX = 12;
const TAP_FALLBACK_MAX_AGE_MS = 560;
const TAP_FALLBACK_ITEMPRESS_GUARD_MS = 140;
/** Защита от двойного вызова (onPressIn + onPress). */
const ITEM_PRESS_DEDUPE_MS = 180;

let webWheelAudioCtx: AudioContext | null = null;
let webWheelLastTickAtMs = 0;

function getWebWheelAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const MaybeAudioContext = (
    window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }
  ).AudioContext ?? (
    window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }
  ).webkitAudioContext;
  if (!MaybeAudioContext) return null;
  if (webWheelAudioCtx == null || webWheelAudioCtx.state === 'closed') {
    webWheelAudioCtx = new MaybeAudioContext();
  }
  return webWheelAudioCtx;
}

function primeWebWheelAudio(): void {
  if (!WHEEL_FEEDBACK_ENABLED) return;
  const ctx = getWebWheelAudioContext();
  if (!ctx || ctx.state !== 'suspended') return;
  void ctx.resume().catch(() => {});
}

function playWebWheelTick(): void {
  if (!WHEEL_FEEDBACK_ENABLED) return;
  const ctx = getWebWheelAudioContext();
  if (!ctx) return;
  const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (nowMs - webWheelLastTickAtMs < WEB_WHEEL_TICK_MIN_GAP_MS) return;
  webWheelLastTickAtMs = nowMs;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  const when = ctx.currentTime + 0.001;
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  const gain = ctx.createGain();
  oscA.type = 'square';
  oscB.type = 'square';
  oscA.frequency.setValueAtTime(1600, when);
  oscB.frequency.setValueAtTime(880, when);
  oscA.frequency.exponentialRampToValueAtTime(1040, when + WEB_WHEEL_TICK_DURATION_S);
  oscB.frequency.exponentialRampToValueAtTime(560, when + WEB_WHEEL_TICK_DURATION_S);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(WEB_WHEEL_TICK_GAIN, when + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + WEB_WHEEL_TICK_DURATION_S);
  oscA.connect(gain);
  oscB.connect(gain);
  gain.connect(ctx.destination);
  oscA.start(when);
  oscB.start(when);
  oscA.stop(when + WEB_WHEEL_TICK_DURATION_S + 0.004);
  oscB.stop(when + WEB_WHEEL_TICK_DURATION_S + 0.002);
  oscA.onended = () => {
    oscA.disconnect();
    oscB.disconnect();
    gain.disconnect();
  };
}

export type WheelPickerColumnHandle = {
  scrollToIndex: (index: number, animated?: boolean) => void;
  /** Актуальный индекс в центре рамки (для «Готово», если state родителя отстаёт) */
  getCenterIndex: () => number;
  /**
   * Привязать offset к ближайшему слоту и вызвать onChangeIndex — нужно перед «Готово»,
   * если палец ещё на колесе и ref/state родителя не успели синхронизироваться.
   */
  snapToNearestAndNotify: () => number;
};

type Props = {
  data: readonly WheelPickerItem[];
  /** Индекс при открытии модалки / смене данных */
  valueIndex: number;
  onChangeIndex: (index: number) => void;
  colors: ColorPalette;
  /** Пока false — не синхронизируем скролл (модалка закрыта) */
  active: boolean;
  /**
   * Тап по строке: выбрать индекс, при необходимости доскроллить и применить (закрыть шторку) без «Готово».
   */
  onItemPress?: (index: number) => void;
};

type WheelPickerRowProps = {
  item: WheelPickerItem;
  index: number;
  colors: ColorPalette;
  theme: string;
  scrollY: SharedValue<number>;
  onItemPress?: (index: number) => void;
  triggerItemApply: (index: number) => void;
};

const WheelPickerRow = memo(function WheelPickerRow({
  item,
  index,
  colors,
  theme,
  scrollY,
  onItemPress,
  triggerItemApply,
}: WheelPickerRowProps) {
  const main = typeof item === 'string' ? item : item.main;
  const sub = typeof item === 'string' ? undefined : item.sub;
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(index - scrollY.value / WHEEL_ITEM_HEIGHT);
    return {
      opacity: wheelOpacityForDistance(distance),
      transform: [{ scale: wheelScaleForDistance(distance) }],
    };
  }, [index]);

  return (
    <Pressable
      style={styles.item}
      accessibilityRole={onItemPress ? 'button' : 'text'}
      onPress={() => triggerItemApply(index)}
    >
      <Animated.View style={[styles.itemInner, animatedStyle]}>
        <Text
          style={[
            sub ? styles.itemTextWithSub : styles.itemText,
            { color: colors.text },
          ]}
          numberOfLines={sub ? 1 : 2}
          ellipsizeMode="tail"
        >
          {main}
        </Text>
        {sub ? (
          <Text
            style={[
              styles.itemSub,
              {
                color: colors.text,
                opacity: theme === 'dark' ? 0.88 : 0.9,
              },
            ]}
            numberOfLines={2}
          >
            {sub}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

export const WheelPickerColumn = forwardRef<WheelPickerColumnHandle, Props>(function WheelPickerColumn(
  { data, valueIndex, onChangeIndex, colors, active, onItemPress },
  ref,
) {
  const { theme } = useTheme();
  const listRef = useRef<FlatList<WheelPickerItem>>(null);
  const wasActiveRef = useRef(false);
  const fingerDownRef = useRef(false);
  const momentumActiveRef = useRef(false);
  const lastYRef = useRef(indexToScrollOffset(valueIndex, data.length));
  /**
   * После `scrollToOffset` при открытии шторки RN часто шлёт `onScroll` с `contentOffset.y === 0` до того,
   * как нативный слой применит offset. Это сбрасывало lastY/center на индекс 0 — «Готово» брало неверную колонку.
   */
  const pendingOpenIdxRef = useRef<number | null>(null);
  const centerIndexRef = useRef(valueIndex);
  const lastPushedToParentRef = useRef<number | null>(null);
  const lastWheelTickIdxRef = useRef<number | null>(null);
  const touchStartScrollYRef = useRef(0);
  const touchStartAtMsRef = useRef(0);
  const lastItemPressAtMsRef = useRef(0);
  const lastItemApplyAtMsRef = useRef(0);
  const nativeWheelTickSoundRef = useRef<Audio.Sound | null>(null);
  const nativeWheelTickSoundLoadPromiseRef = useRef<Promise<Audio.Sound | null> | null>(null);
  const nativeWheelLastTickAtMsRef = useRef(0);
  const scrollY = useSharedValue(lastYRef.current);

  const getNativeWheelTickSound = useCallback(async () => {
    if (!WHEEL_FEEDBACK_ENABLED) return null;
    if (Platform.OS === 'web') return null;
    if (nativeWheelTickSoundRef.current) return nativeWheelTickSoundRef.current;
    if (nativeWheelTickSoundLoadPromiseRef.current) return nativeWheelTickSoundLoadPromiseRef.current;

    nativeWheelTickSoundLoadPromiseRef.current = Audio.Sound.createAsync(WHEEL_TICK_SOUND, {
      shouldPlay: false,
      volume: 0.55,
    })
      .then(({ sound }) => {
        nativeWheelTickSoundRef.current = sound;
        return sound;
      })
      .catch(() => null)
      .finally(() => {
        nativeWheelTickSoundLoadPromiseRef.current = null;
      });

    return nativeWheelTickSoundLoadPromiseRef.current;
  }, []);

  const primeWheelTickAudio = useCallback(() => {
    if (!WHEEL_FEEDBACK_ENABLED) return;
    if (Platform.OS === 'web') {
      primeWebWheelAudio();
      return;
    }
    void getNativeWheelTickSound();
  }, [getNativeWheelTickSound]);

  const playWheelTick = useCallback(() => {
    if (!WHEEL_FEEDBACK_ENABLED) return;
    if (Platform.OS === 'web') {
      playWebWheelTick();
      return;
    }
    const nowMs = Date.now();
    if (nowMs - nativeWheelLastTickAtMsRef.current < NATIVE_WHEEL_TICK_MIN_GAP_MS) return;
    nativeWheelLastTickAtMsRef.current = nowMs;
    void (async () => {
      try {
        const sound = await getNativeWheelTickSound();
        if (!sound) return;
        await sound.replayAsync();
      } catch {
        // Tick is purely decorative and should never block picker interaction.
      }
    })();
  }, [getNativeWheelTickSound]);

  const setCenterIndexRef = useCallback((idx: number) => {
    centerIndexRef.current = idx;
  }, []);

  const animatedScrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        scrollY.value = event.contentOffset.y;
      },
    },
    [],
  );

  const syncCenterFromOffset = useCallback(
    (y: number, pushToParent: boolean) => {
      const clamped = nearestSnapIndex(y, data.length);
      const clampedY = indexToScrollOffset(clamped, data.length);
      lastYRef.current = clampedY;
      scrollY.value = clampedY;
      setCenterIndexRef(clamped);
      if (pushToParent && lastPushedToParentRef.current !== clamped) {
        lastPushedToParentRef.current = clamped;
        onChangeIndex(clamped);
      }
      return clamped;
    },
    [data.length, onChangeIndex, scrollY, setCenterIndexRef],
  );

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      if (!data.length) return;
      const i = Math.max(0, Math.min(data.length - 1, index));
      const target = indexToScrollOffset(i, data.length);
      listRef.current?.scrollToOffset({ offset: target, animated });
      lastYRef.current = target;
      scrollY.value = target;
      setCenterIndexRef(i);
    },
    [data.length, scrollY, setCenterIndexRef],
  );

  useEffect(() => {
    if (!active) {
      const len = data.length;
      const vi = len <= 0 ? 0 : Math.max(0, Math.min(len - 1, valueIndex));
      const y = len > 0 ? vi * WHEEL_ITEM_HEIGHT : 0;
      lastPushedToParentRef.current = null;
      lastYRef.current = y;
      scrollY.value = y;
      setCenterIndexRef(vi);
      lastWheelTickIdxRef.current = null;
    }
  }, [active, data.length, scrollY, setCenterIndexRef, valueIndex]);

  useLayoutEffect(() => {
    if (!active || data.length === 0) {
      wasActiveRef.current = false;
      pendingOpenIdxRef.current = null;
      return;
    }
    if (!wasActiveRef.current) {
      wasActiveRef.current = true;
      const i = Math.max(0, Math.min(data.length - 1, valueIndex));
      const y = i * WHEEL_ITEM_HEIGHT;
      pendingOpenIdxRef.current = i;
      lastYRef.current = y;
      scrollY.value = y;
      setCenterIndexRef(i);
      lastPushedToParentRef.current = i;
      lastWheelTickIdxRef.current = i;
      listRef.current?.scrollToOffset({ offset: y, animated: false });
    }
  }, [active, data.length, scrollY, setCenterIndexRef, valueIndex]);

  const snapToNearestAndNotify = useCallback(() => {
    fingerDownRef.current = false;
    momentumActiveRef.current = false;
    if (!data.length) return 0;
    const idx = nearestSnapIndex(scrollY.value, data.length);
    const clampedY = indexToScrollOffset(idx, data.length);
    listRef.current?.scrollToOffset({ offset: clampedY, animated: false });
    syncCenterFromOffset(clampedY, true);
    return idx;
  }, [data.length, scrollY, syncCenterFromOffset]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex,
      getCenterIndex: () => nearestSnapIndex(scrollY.value, data.length),
      snapToNearestAndNotify,
    }),
    [data.length, scrollToIndex, scrollY, snapToNearestAndNotify],
  );

  const onScrollBeginDrag = useCallback(() => {
    pendingOpenIdxRef.current = null;
    fingerDownRef.current = true;
    momentumActiveRef.current = false;
    touchStartScrollYRef.current = lastYRef.current;
    touchStartAtMsRef.current = Date.now();
    primeWheelTickAudio();
  }, [primeWheelTickAudio]);

  const finalizeFromNativeEvent = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>, pushToParent: boolean) => {
      const y = e.nativeEvent.contentOffset.y;
      const pend = pendingOpenIdxRef.current;
      if (pend != null) {
        const idx = nearestSnapIndex(y, data.length);
        if (pend === 0 || (idx === pend && Math.abs(y - pend * WHEEL_ITEM_HEIGHT) <= 3)) {
          pendingOpenIdxRef.current = null;
        }
      }
      const idx = syncCenterFromOffset(y, pushToParent);
      const clampedY = indexToScrollOffset(idx, data.length);
      if (Math.abs(y - clampedY) > 1) {
        listRef.current?.scrollToOffset({ offset: clampedY, animated: false });
      }
    },
    [data.length, syncCenterFromOffset],
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      fingerDownRef.current = false;
      const y = e.nativeEvent.contentOffset.y;
      lastYRef.current = y;
      scrollY.value = y;
      const vy = e.nativeEvent.velocity?.y;
      if (vy != null && Math.abs(vy) > 0.05) return;
      requestAnimationFrame(() => {
        if (momentumActiveRef.current) return;
        finalizeFromNativeEvent(e, true);
      });
    },
    [finalizeFromNativeEvent, scrollY],
  );

  const onMomentumScrollBegin = useCallback(() => {
    momentumActiveRef.current = true;
  }, []);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      momentumActiveRef.current = false;
      finalizeFromNativeEvent(e, true);
    },
    [finalizeFromNativeEvent],
  );

  const applyTappedIndex = useCallback(
    (index: number) => {
      if (!data.length) return;
      const clamped = Math.max(0, Math.min(data.length - 1, index));
      pendingOpenIdxRef.current = null;
      lastPushedToParentRef.current = clamped;
      onChangeIndex(clamped);
      setCenterIndexRef(clamped);
      lastWheelTickIdxRef.current = clamped;
      primeWheelTickAudio();
      if (WHEEL_FEEDBACK_ENABLED) {
        void Haptics.selectionAsync().catch(() => {});
      }
      playWheelTick();
      scrollToIndex(clamped, true);
      onItemPress?.(clamped);
    },
    [
      data.length,
      onChangeIndex,
      onItemPress,
      playWheelTick,
      primeWheelTickAudio,
      scrollToIndex,
      setCenterIndexRef,
    ],
  );

  const triggerItemApply = useCallback(
    (index: number) => {
      const now = Date.now();
      if (now - lastItemApplyAtMsRef.current < ITEM_PRESS_DEDUPE_MS) return;
      lastItemApplyAtMsRef.current = now;
      lastItemPressAtMsRef.current = now;
      applyTappedIndex(index);
    },
    [applyTappedIndex],
  );

  const onWheelTouchEnd = useCallback((e: NativeSyntheticEvent<NativeTouchEvent>) => {
    fingerDownRef.current = false;
    const msSinceItemPress = Date.now() - lastItemPressAtMsRef.current;
    const travel = Math.abs(lastYRef.current - touchStartScrollYRef.current);
    const tapAgeMs = Date.now() - touchStartAtMsRef.current;
    if (
      msSinceItemPress > TAP_FALLBACK_ITEMPRESS_GUARD_MS &&
      travel < TAP_FALLBACK_MAX_TRAVEL_PX &&
      tapAgeMs < TAP_FALLBACK_MAX_AGE_MS &&
      data.length > 0
    ) {
      const yTap = e.nativeEvent.locationY;
      const tapLooksValid = Number.isFinite(yTap) && yTap >= 0 && yTap <= WHEEL_VIEWPORT_HEIGHT;
      if (!tapLooksValid) return;
      const roughIndex = Math.round((scrollY.value + yTap - PAD_Y) / WHEEL_ITEM_HEIGHT);
      if (!Number.isFinite(roughIndex)) return;
      applyTappedIndex(roughIndex);
    }
  }, [applyTappedIndex, data.length, scrollY]);

  const onWheelTouchCancel = useCallback(() => {
    fingerDownRef.current = false;
  }, []);

  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    void getNativeWheelTickSound();
  }, [active, getNativeWheelTickSound]);

  useEffect(
    () => () => {
      const sound = nativeWheelTickSoundRef.current;
      nativeWheelTickSoundRef.current = null;
      if (sound) {
        void sound.unloadAsync();
      }
    },
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: WheelPickerItem; index: number }) => (
      <WheelPickerRow
        item={item}
        index={index}
        colors={colors}
        theme={theme}
        scrollY={scrollY}
        onItemPress={onItemPress}
        triggerItemApply={triggerItemApply}
      />
    ),
    [colors, onItemPress, scrollY, theme, triggerItemApply],
  );

  const listPadHeader = useCallback(() => <View style={styles.listPadSection} />, []);
  const listPadFooter = useCallback(() => <View style={styles.listPadSection} />, []);

  const extraData = useMemo(
    () => ({
      text: colors.text,
      theme,
    }),
    [colors.text, theme],
  );

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.highlight,
          {
            pointerEvents: 'none',
            borderColor: colors.accent,
            top: PAD_Y + HIGHLIGHT_INSET_Y,
            bottom: PAD_Y + HIGHLIGHT_INSET_Y,
            left: HIGHLIGHT_INSET_X,
            right: HIGHLIGHT_INSET_X,
          },
        ]}
      />
      <Animated.FlatList
        style={styles.listAboveHighlight}
        ref={listRef}
        data={data as WheelPickerItem[]}
        extraData={extraData}
        keyExtractor={(item, i) =>
          typeof item === 'string' ? `s${i}-${item}` : `m${i}-${item.main}-${item.sub ?? ''}`
        }
        renderItem={renderItem}
        ListHeaderComponent={listPadHeader}
        ListFooterComponent={listPadFooter}
        onTouchStart={onScrollBeginDrag}
        onTouchEnd={onWheelTouchEnd}
        onTouchCancel={onWheelTouchCancel}
        showsVerticalScrollIndicator={false}
        {...Platform.select({
          ios: {
            /** Меньше значение — короче докат после жеста (колесо «не летит»). */
            decelerationRate: 0.972,
          },
          android: {
            /** Сильнее гасим инерцию, чем на iOS — Android иначе часто даёт длинный флинг. */
            decelerationRate: 0.965,
            overScrollMode: 'never' as const,
          },
          default: { decelerationRate: 'normal' as const },
        })}
        getItemLayout={(_, index) => ({
          length: WHEEL_ITEM_HEIGHT,
          offset: PAD_Y + WHEEL_ITEM_HEIGHT * index,
          index,
        })}
        initialNumToRender={VISIBLE_ROWS + 4}
        maxToRenderPerBatch={VISIBLE_ROWS + 4}
        windowSize={5}
        onScroll={animatedScrollHandler}
        scrollEventThrottle={16}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onMomentumScrollEnd={onMomentumEnd}
        onScrollEndDrag={onScrollEndDrag}
        nestedScrollEnabled
        /** Android иногда обрезает вторую строку при clipping; окно списка уже ограничено параметрами выше. */
        removeClippedSubviews={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        snapToAlignment="start"
        disableIntervalMomentum
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    height: WHEEL_VIEWPORT_HEIGHT,
    position: 'relative',
  },
  /** Рамка под строками — иначе заливка/бордер рисуются поверх текста и «съезжают». */
  listAboveHighlight: {
    zIndex: 1,
  },
  highlight: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1.5,
    zIndex: 0,
    overflow: 'hidden',
  },
  /** Высота как у бывшего paddingVertical — getItemLayout совпадает с реальной геометрией */
  listPadSection: {
    height: PAD_Y,
  },
  item: {
    height: WHEEL_ITEM_HEIGHT,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  itemInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  /** Одна строка — как раньше */
  itemText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
      ios: {
        marginTop: -1,
      },
      default: {},
    }),
  },
  /** Две строки — чуть плотнее, чтобы влезать в 46px */
  itemTextWithSub: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
      default: {},
    }),
  },
  itemSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textAlign: 'center',
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
});
