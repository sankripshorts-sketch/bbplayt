import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  Easing,
  FlatList,
  type NativeTouchEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Audio, type AVPlaybackSource } from 'expo-av';
import * as Haptics from 'expo-haptics';
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

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** `d` — расстояние от центра в долях строки (0 = в центре рамки, 1 = ровно на соседней). */
function wheelScaleForDistance(d: number): number {
  if (d <= 1) {
    return WHEEL_SCALE_ACTIVE + (WHEEL_SCALE_NEIGHBOR - WHEEL_SCALE_ACTIVE) * smoothstep01(d);
  }
  if (d <= 2) {
    return WHEEL_SCALE_NEIGHBOR + (WHEEL_SCALE_FAR - WHEEL_SCALE_NEIGHBOR) * smoothstep01(d - 1);
  }
  return WHEEL_SCALE_FAR;
}

function wheelOpacityForDistance(d: number): number {
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
  if (length <= 0) return 0;
  const idx = Math.round(y / WHEEL_ITEM_HEIGHT);
  return Math.min(length - 1, Math.max(0, idx));
}

function indexToScrollOffset(idx: number, length: number): number {
  const i = Math.max(0, Math.min(length - 1, idx));
  return i * WHEEL_ITEM_HEIGHT;
}

/**
 * Доводка к слоту: мягкое замедление к цели — без резкого «щёлка» на коротких дистанциях.
 */
const MAGNETIC_EASE = Easing.bezier(0.22, 0.61, 0.36, 1);

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
  const ctx = getWebWheelAudioContext();
  if (!ctx || ctx.state !== 'suspended') return;
  void ctx.resume().catch(() => {});
}

function playWebWheelTick(): void {
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

export const WheelPickerColumn = forwardRef<WheelPickerColumnHandle, Props>(function WheelPickerColumn(
  { data, valueIndex, onChangeIndex, colors, active, onItemPress },
  ref,
) {
  const { theme } = useTheme();
  const listRef = useRef<FlatList<WheelPickerItem>>(null);
  const wasActiveRef = useRef(false);
  /** Поколение анимации — увеличивается при новом жесте, чтобы отменить прошлый snap */
  const snapGenRef = useRef(0);
  const isMagneticAnimRef = useRef(false);
  /** Нативная инерция после отпускания — не вмешиваемся в scrollToOffset до её конца */
  const momentumActiveRef = useRef(false);
  /** Пока палец на колесе — только подсветка слота, без «магнита» и без onChange у родителя */
  const fingerDownRef = useRef(false);
  const lastYRef = useRef(0);
  /**
   * После `scrollToOffset` при открытии шторки RN часто шлёт `onScroll` с `contentOffset.y === 0` до того,
   * как нативный слой применит offset. Это сбрасывало lastY/center на индекс 0 — «Готово» брало неверную колонку
   * (часто время совпадало с 0, длительность — нет).
   */
  const pendingOpenIdxRef = useRef<number | null>(null);
  /** Индекс строки в центре рамки — обновляется при скролле, чтобы активный текст был белым во время прокрутки */
  const [centerIndex, setCenterIndex] = useState(valueIndex);
  const centerIndexRef = useRef(valueIndex);
  const lastPushedToParentRef = useRef<number | null>(null);
  /** Непрерывный offset для плавного масштаба/прозрачности (синхронизируется с lastYRef). */
  const [scrollYLive, setScrollYLive] = useState(0);
  const scrollYForPaintRef = useRef(0);
  const visualPaintRafRef = useRef<number | null>(null);
  /** Чтобы не дублировать «щелчок» и не щёлкать во время программной доводки (runMagneticScroll). */
  const lastWheelTickIdxRef = useRef<number | null>(null);
  /** Fallback для тапа: когда Pressable отменён скролл-резпондером, выбираем элемент по координате касания. */
  const touchStartScrollYRef = useRef(0);
  const touchStartAtMsRef = useRef(0);
  const lastItemPressAtMsRef = useRef(0);
  const lastItemApplyAtMsRef = useRef(0);
  const nativeWheelTickSoundRef = useRef<Audio.Sound | null>(null);
  const nativeWheelTickSoundLoadPromiseRef = useRef<Promise<Audio.Sound | null> | null>(null);
  const nativeWheelLastTickAtMsRef = useRef(0);

  const getNativeWheelTickSound = useCallback(async () => {
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
    if (Platform.OS === 'web') {
      primeWebWheelAudio();
      return;
    }
    void getNativeWheelTickSound();
  }, [getNativeWheelTickSound]);

  const playWheelTick = useCallback(() => {
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

  const scheduleVisualScrollPaint = useCallback(() => {
    if (visualPaintRafRef.current != null) return;
    visualPaintRafRef.current = requestAnimationFrame(() => {
      visualPaintRafRef.current = null;
      setScrollYLive(scrollYForPaintRef.current);
    });
  }, []);

  /** Пока шторка закрыта — держим центр и lastY в согласии с props, чтобы при повторном открытии не было скачка/сброса */
  useEffect(() => {
    if (!active) {
      const len = data.length;
      const vi = len <= 0 ? 0 : Math.max(0, Math.min(len - 1, valueIndex));
      const y = len > 0 ? vi * WHEEL_ITEM_HEIGHT : 0;
      setCenterIndex(vi);
      centerIndexRef.current = vi;
      lastPushedToParentRef.current = null;
      lastYRef.current = y;
      scrollYForPaintRef.current = y;
      setScrollYLive(y);
      lastWheelTickIdxRef.current = null;
    }
  }, [valueIndex, active, data.length]);

  const maybePlayWheelTick = useCallback(
    (nextIdx: number) => {
      if (!active || data.length <= 0) return;
      if (pendingOpenIdxRef.current != null) return;
      if (isMagneticAnimRef.current) return;
      if (lastWheelTickIdxRef.current === nextIdx) return;
      lastWheelTickIdxRef.current = nextIdx;
      playWheelTick();
    },
    [active, data.length, playWheelTick],
  );

  const runMagneticScroll = useCallback((fromY: number, toY: number, onDone: () => void) => {
    const dist = Math.abs(toY - fromY);
    if (dist < 0.75) {
      listRef.current?.scrollToOffset({ offset: toY, animated: false });
      scrollYForPaintRef.current = toY;
      setScrollYLive(toY);
      onDone();
      return;
    }
    const gen = ++snapGenRef.current;
    isMagneticAnimRef.current = true;
    /** Короче и чуть резче — доводка после жеста, не «тянется» поверх инерции */
    const duration = Math.min(190, Math.max(48, 26 + dist * 1.05));
    const delta = toY - fromY;
    let startTs: number | null = null;

    const frame = (ts: number) => {
      if (gen !== snapGenRef.current) {
        isMagneticAnimRef.current = false;
        return;
      }
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / duration);
      const eased = MAGNETIC_EASE(t);
      const y = fromY + delta * eased;
      listRef.current?.scrollToOffset({ offset: y, animated: false });
      scrollYForPaintRef.current = y;
      scheduleVisualScrollPaint();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        listRef.current?.scrollToOffset({ offset: toY, animated: false });
        scrollYForPaintRef.current = toY;
        setScrollYLive(toY);
        isMagneticAnimRef.current = false;
        if (gen === snapGenRef.current) onDone();
      }
    };
    requestAnimationFrame(frame);
  }, [scheduleVisualScrollPaint]);

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      const i = Math.max(0, Math.min(data.length - 1, index));
      const target = i * WHEEL_ITEM_HEIGHT;
      if (!animated) {
        snapGenRef.current += 1;
        listRef.current?.scrollToOffset({ offset: target, animated: false });
        lastYRef.current = target;
        scrollYForPaintRef.current = target;
        setScrollYLive(target);
        return;
      }
      const from = lastYRef.current;
      runMagneticScroll(from, target, () => {
        lastYRef.current = target;
      });
    },
    [data.length, runMagneticScroll],
  );

  useLayoutEffect(() => {
    if (!active || data.length === 0) {
      wasActiveRef.current = false;
      pendingOpenIdxRef.current = null;
      return;
    }
    if (!wasActiveRef.current) {
      wasActiveRef.current = true;
      const i = Math.max(0, Math.min(data.length - 1, valueIndex));
      /** Сразу синхронизируем ref/state: иначе «Готово» до первого кадра читает старый getCenterIndex() и ставит неверную длительность/время. */
      const y = i * WHEEL_ITEM_HEIGHT;
      pendingOpenIdxRef.current = i;
      lastYRef.current = y;
      scrollYForPaintRef.current = y;
      setScrollYLive(y);
      centerIndexRef.current = i;
      setCenterIndex(i);
      lastPushedToParentRef.current = i;
      lastWheelTickIdxRef.current = i;
      snapGenRef.current += 1;
      listRef.current?.scrollToOffset({ offset: y, animated: false });
    }
  }, [active, data.length, valueIndex]);

  const syncCenterFromOffset = useCallback(
    (y: number, pushToParent: boolean) => {
      const clamped = nearestSnapIndex(y, data.length);
      setCenterIndex((prev) => (prev === clamped ? prev : clamped));
      centerIndexRef.current = clamped;
      if (pushToParent && lastPushedToParentRef.current !== clamped) {
        lastPushedToParentRef.current = clamped;
        onChangeIndex(clamped);
      }
      return clamped;
    },
    [data.length, onChangeIndex],
  );

  const syncVisualCenterOnly = useCallback((y: number) => {
    const clamped = nearestSnapIndex(y, data.length);
    setCenterIndex((prev) => (prev === clamped ? prev : clamped));
    centerIndexRef.current = clamped;
  }, [data.length]);

  /** Нативный snap отключён — иначе контент успевает «встать» в слот до JS, и магнит не виден / конфликтует с rAF */
  const idleSnapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Была ли реальная инерция после жеста — чтобы не дублировать snap, если momentum не пришёл */
  const momentumSeenRef = useRef(false);
  const noMomentumFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Принудительно к ближайшему offset — «докрутка» с плавным easing */
  const finalizeSnap = useCallback(
    (y: number) => {
      if (!data.length) return;
      const idx = nearestSnapIndex(y, data.length);
      const clampedY = indexToScrollOffset(idx, data.length);
      if (Math.abs(y - clampedY) <= 1) {
        lastYRef.current = clampedY;
        syncCenterFromOffset(clampedY, true);
        return;
      }
      runMagneticScroll(y, clampedY, () => {
        lastYRef.current = clampedY;
        syncCenterFromOffset(clampedY, true);
      });
    },
    [data.length, syncCenterFromOffset, runMagneticScroll],
  );

  /**
   * Доводка только когда offset перестал меняться между кадрами — иначе магнит драется с нативной прокруткой.
   */
  const finalizeSnapIfSettled = useCallback(() => {
    if (fingerDownRef.current || isMagneticAnimRef.current) return;
    if (momentumActiveRef.current) return;
    const y0 = lastYRef.current;
    requestAnimationFrame(() => {
      if (fingerDownRef.current || isMagneticAnimRef.current || momentumActiveRef.current) return;
      const y1 = lastYRef.current;
      if (Math.abs(y1 - y0) > 0.6) return;
      requestAnimationFrame(() => {
        if (fingerDownRef.current || isMagneticAnimRef.current || momentumActiveRef.current) return;
        if (Math.abs(lastYRef.current - y1) > 0.6) return;
        finalizeSnap(lastYRef.current);
      });
    });
  }, [finalizeSnap]);

  const snapToNearestAndNotify = useCallback(() => {
    fingerDownRef.current = false;
    if (idleSnapTimerRef.current) {
      clearTimeout(idleSnapTimerRef.current);
      idleSnapTimerRef.current = null;
    }
    if (noMomentumFallbackTimerRef.current) {
      clearTimeout(noMomentumFallbackTimerRef.current);
      noMomentumFallbackTimerRef.current = null;
    }
    if (!data.length) return 0;
    snapGenRef.current += 1;
    isMagneticAnimRef.current = false;
    momentumActiveRef.current = false;
    const idx = nearestSnapIndex(lastYRef.current, data.length);
    const clampedY = indexToScrollOffset(idx, data.length);
    listRef.current?.scrollToOffset({ offset: clampedY, animated: false });
    lastYRef.current = clampedY;
    scrollYForPaintRef.current = clampedY;
    setScrollYLive(clampedY);
    centerIndexRef.current = idx;
    setCenterIndex(idx);
    lastPushedToParentRef.current = idx;
    onChangeIndex(idx);
    return idx;
  }, [data.length, onChangeIndex]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex,
      getCenterIndex: () => centerIndexRef.current,
      snapToNearestAndNotify,
    }),
    [scrollToIndex, snapToNearestAndNotify],
  );

  const cancelIdleSnapAndBumpGesture = useCallback(() => {
    snapGenRef.current += 1;
    isMagneticAnimRef.current = false;
    momentumActiveRef.current = false;
    momentumSeenRef.current = false;
    if (idleSnapTimerRef.current) {
      clearTimeout(idleSnapTimerRef.current);
      idleSnapTimerRef.current = null;
    }
    if (noMomentumFallbackTimerRef.current) {
      clearTimeout(noMomentumFallbackTimerRef.current);
      noMomentumFallbackTimerRef.current = null;
    }
  }, []);

  const onScrollBeginDrag = useCallback(() => {
    pendingOpenIdxRef.current = null;
    fingerDownRef.current = true;
    primeWheelTickAudio();
    cancelIdleSnapAndBumpGesture();
  }, [cancelIdleSnapAndBumpGesture, primeWheelTickAudio]);

  /** На части устройств/вложений onScrollBeginDrag приходит ненадёжно — без этого idle-таймер доводит колесо во время медленного жеста. */
  const onWheelTouchStart = useCallback(() => {
    pendingOpenIdxRef.current = null;
    fingerDownRef.current = true;
    touchStartScrollYRef.current = lastYRef.current;
    touchStartAtMsRef.current = Date.now();
    primeWheelTickAudio();
    cancelIdleSnapAndBumpGesture();
  }, [cancelIdleSnapAndBumpGesture, primeWheelTickAudio]);

  /**
   * После отпускания пальца: на части устройств `onScrollEndDrag` не приходит, если жест
   * не считался drag’ом — тогда offset остаётся «между» строками без докрутки.
   * Двойной rAF — дать шанс `onMomentumScrollBegin`, если это был лёгкий флинг.
   */
  const scheduleSnapAfterFingerUp = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (fingerDownRef.current) return;
        if (momentumActiveRef.current || isMagneticAnimRef.current) return;
        finalizeSnapIfSettled();
      });
    });
  }, [finalizeSnapIfSettled]);

  const applyTappedIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(data.length - 1, index));
      pendingOpenIdxRef.current = null;
      lastPushedToParentRef.current = clamped;
      onChangeIndex(clamped);
      setCenterIndex(clamped);
      centerIndexRef.current = clamped;
      lastWheelTickIdxRef.current = clamped;
      primeWheelTickAudio();
      void Haptics.selectionAsync().catch(() => {});
      playWheelTick();
      scrollToIndex(clamped, true);
      onItemPress?.(clamped);
    },
    [data.length, onChangeIndex, onItemPress, playWheelTick, primeWheelTickAudio, scrollToIndex],
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
    if (idleSnapTimerRef.current) {
      clearTimeout(idleSnapTimerRef.current);
      idleSnapTimerRef.current = null;
    }
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
      if (!tapLooksValid) {
        scheduleSnapAfterFingerUp();
        return;
      }
      /**
       * Если RN отменил `onPress` как «начатый скролл», выбираем строку по позиции касания.
       * Для web `locationY` в touch-end иногда шумный, но fallback остаётся безопасным,
       * потому что срабатывает только без реальной прокрутки.
       */
      const roughIndex = Math.round((lastYRef.current + yTap - PAD_Y) / WHEEL_ITEM_HEIGHT);
      if (!Number.isFinite(roughIndex)) {
        scheduleSnapAfterFingerUp();
        return;
      }
      applyTappedIndex(roughIndex);
      return;
    }
    scheduleSnapAfterFingerUp();
  }, [applyTappedIndex, data.length, scheduleSnapAfterFingerUp]);

  const onWheelTouchCancel = useCallback(() => {
    fingerDownRef.current = false;
    if (idleSnapTimerRef.current) {
      clearTimeout(idleSnapTimerRef.current);
      idleSnapTimerRef.current = null;
    }
    scheduleSnapAfterFingerUp();
  }, [scheduleSnapAfterFingerUp]);

  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    void getNativeWheelTickSound();
  }, [active, getNativeWheelTickSound]);

  useEffect(
    () => () => {
      if (idleSnapTimerRef.current) clearTimeout(idleSnapTimerRef.current);
      if (noMomentumFallbackTimerRef.current) clearTimeout(noMomentumFallbackTimerRef.current);
      if (visualPaintRafRef.current != null) {
        cancelAnimationFrame(visualPaintRafRef.current);
        visualPaintRafRef.current = null;
      }
      const sound = nativeWheelTickSoundRef.current;
      nativeWheelTickSoundRef.current = null;
      if (sound) {
        void sound.unloadAsync();
      }
    },
    [],
  );

  const onMomentumScrollBegin = useCallback(() => {
    momentumActiveRef.current = true;
    momentumSeenRef.current = true;
    if (noMomentumFallbackTimerRef.current) {
      clearTimeout(noMomentumFallbackTimerRef.current);
      noMomentumFallbackTimerRef.current = null;
    }
  }, []);

  /**
   * После отпускания: при флинге не трогаем offset — даём докатиться нативно, магнит в onMomentumScrollEnd.
   * Без инерции — двойной rAF, чтобы не пересечься с только что начавшимся momentum.
   */
  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      fingerDownRef.current = false;
      if (idleSnapTimerRef.current) {
        clearTimeout(idleSnapTimerRef.current);
        idleSnapTimerRef.current = null;
      }
      const vy = e.nativeEvent.velocity?.y;
      /**
       * Сильный флинг: не доводить через 2×rAF — до `onMomentumScrollBegin` флага инерции часто нет,
       * и магнит включается поверх нативного скролла. Ждём `onMomentumScrollEnd`.
       * Если инерции не будет (баг RN / нулевая дистанция) — отложенный fallback.
       */
      if (vy != null && Math.abs(vy) > 0.28) {
        momentumSeenRef.current = false;
        if (noMomentumFallbackTimerRef.current) clearTimeout(noMomentumFallbackTimerRef.current);
        noMomentumFallbackTimerRef.current = setTimeout(() => {
          noMomentumFallbackTimerRef.current = null;
          if (fingerDownRef.current || isMagneticAnimRef.current || momentumActiveRef.current) return;
          if (momentumSeenRef.current) return;
          finalizeSnapIfSettled();
        }, 120);
        return;
      }
      requestAnimationFrame(() => {
        if (momentumActiveRef.current || isMagneticAnimRef.current) return;
        finalizeSnapIfSettled();
      });
    },
    [finalizeSnapIfSettled],
  );

  const onMomentumEnd = useCallback(
    (_e: NativeSyntheticEvent<NativeScrollEvent>) => {
      momentumActiveRef.current = false;
      if (noMomentumFallbackTimerRef.current) {
        clearTimeout(noMomentumFallbackTimerRef.current);
        noMomentumFallbackTimerRef.current = null;
      }
      if (idleSnapTimerRef.current) {
        clearTimeout(idleSnapTimerRef.current);
        idleSnapTimerRef.current = null;
      }
      if (isMagneticAnimRef.current) return;
      finalizeSnapIfSettled();
    },
    [finalizeSnapIfSettled],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const pend = pendingOpenIdxRef.current;
      if (pend != null) {
        if (pend !== 0 && y === 0) {
          return;
        }
        const yi = nearestSnapIndex(y, data.length);
        if (yi === pend && Math.abs(y - pend * WHEEL_ITEM_HEIGHT) <= 3) {
          pendingOpenIdxRef.current = null;
        }
      }
      lastYRef.current = y;
      scrollYForPaintRef.current = y;
      scheduleVisualScrollPaint();
      if (isMagneticAnimRef.current) {
        const clamped = nearestSnapIndex(y, data.length);
        setCenterIndex((prev) => (prev === clamped ? prev : clamped));
        centerIndexRef.current = clamped;
        return;
      }
      const idx = nearestSnapIndex(y, data.length);
      if (fingerDownRef.current) {
        syncVisualCenterOnly(y);
        maybePlayWheelTick(idx);
        return;
      }
      /**
       * Пока список ещет (инерция или «фейковая» инерция без события begin): только подсветка центра,
       * без onChange на каждый кадр и без раннего магнита.
       */
      syncVisualCenterOnly(y);
      maybePlayWheelTick(idx);
      /** Fallback: редкие Android-кейсы без end/momentum — доводка после паузы, с проверкой стабильности */
      if (idleSnapTimerRef.current) clearTimeout(idleSnapTimerRef.current);
      idleSnapTimerRef.current = setTimeout(() => {
        idleSnapTimerRef.current = null;
        if (fingerDownRef.current || isMagneticAnimRef.current || momentumActiveRef.current) return;
        finalizeSnapIfSettled();
      }, 75);
    },
    [data.length, syncVisualCenterOnly, finalizeSnapIfSettled, scheduleVisualScrollPaint, maybePlayWheelTick],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: WheelPickerItem; index: number }) => {
      const fracCenter =
        data.length > 0 ? scrollYLive / WHEEL_ITEM_HEIGHT : 0;
      const dist = Math.abs(index - fracCenter);
      const scale = wheelScaleForDistance(dist);
      const rowOpacity = wheelOpacityForDistance(dist);
      const visualSel = nearestSnapIndex(scrollYLive, data.length);
      const on = index === visualSel;
      const main = typeof item === 'string' ? item : item.main;
      const sub = typeof item === 'string' ? undefined : item.sub;
      return (
        <Pressable
          style={styles.item}
          accessibilityRole={onItemPress ? 'button' : 'text'}
          accessibilityState={{ selected: on }}
          onPress={() => triggerItemApply(index)}
        >
          <View
            style={[
              styles.itemInner,
              { transform: [{ scale }], opacity: rowOpacity },
            ]}
          >
            <Text
              style={[
                sub ? styles.itemTextWithSub : styles.itemText,
                { color: on ? colors.text : colors.muted },
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
                  on
                    ? {
                        color: colors.text,
                        opacity: theme === 'dark' ? 0.88 : 0.9,
                      }
                    : theme === 'dark'
                      ? { color: colors.muted, opacity: 0.92 }
                      : { color: colors.muted, opacity: 0.88 },
                ]}
                numberOfLines={2}
              >
                {sub}
              </Text>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [
      scrollYLive,
      data.length,
      colors.muted,
      colors.mutedDark,
      colors.text,
      onChangeIndex,
      onItemPress,
      triggerItemApply,
      theme,
    ],
  );

  const listPadHeader = useCallback(() => <View style={styles.listPadSection} />, []);
  const listPadFooter = useCallback(() => <View style={styles.listPadSection} />, []);

  /** Иначе при подгрузке прайса ячейки с тем же индексом не перерисовывают вторую строку «Выгоднее…». */
  const dataRenderSignature = data
    .map((x) => (typeof x === 'string' ? `s:${x}` : `m:${x.main}|${x.sub ?? ''}`))
    .join('\u0001');

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
      <FlatList
        style={styles.listAboveHighlight}
        ref={listRef}
        data={data as WheelPickerItem[]}
        extraData={{ sig: dataRenderSignature, scrollYLive, centerIndex }}
        keyExtractor={(item, i) =>
          typeof item === 'string' ? `s${i}-${item}` : `m${i}-${item.main}-${item.sub ?? ''}`
        }
        renderItem={renderItem}
        ListHeaderComponent={listPadHeader}
        ListFooterComponent={listPadFooter}
        onTouchStart={onWheelTouchStart}
        onTouchEnd={onWheelTouchEnd}
        onTouchCancel={onWheelTouchCancel}
        showsVerticalScrollIndicator={false}
        {...Platform.select({
          ios: {
            /** Меньше значение — короче докат после жеста (колесо «не летит»). */
            decelerationRate: 0.958,
          },
          android: {
            /** Сильнее гасим инерцию, чем на iOS — Android иначе часто даёт длинный флинг. */
            decelerationRate: 0.935,
            overScrollMode: 'never' as const,
          },
          default: { decelerationRate: 'normal' as const },
        })}
        disableIntervalMomentum={false}
        getItemLayout={(_, index) => ({
          length: WHEEL_ITEM_HEIGHT,
          offset: PAD_Y + WHEEL_ITEM_HEIGHT * index,
          index,
        })}
        onScroll={onScroll}
        scrollEventThrottle={4}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onMomentumScrollEnd={onMomentumEnd}
        onScrollEndDrag={onScrollEndDrag}
        nestedScrollEnabled
        /** Иначе на Android вторая строка ячейки иногда не рисуется. */
        removeClippedSubviews={false}
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
