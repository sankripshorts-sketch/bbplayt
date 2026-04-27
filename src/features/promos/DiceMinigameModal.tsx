import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';

import { Audio, type AVPlaybackSource } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tryConsumeOneDiceRoll } from '../../preferences/diceMinigameRolls';
import { getDiceRollsTotalAvailable, loadAppPreferences, patchAppPreferences } from '../../preferences/appPreferences';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { CenteredCardModal } from './CenteredCardModal';
import { DICE_MINIGAME_WIN_BONUS_RUB } from './promoConstants';
import { PROMO_VISUAL } from './promoCatalog';
import { usePromoModalBodyHeight } from './usePromoModalMinBodyHeight';
import { Dice3DView } from './dice3d/Dice3DView';

/** Обычный бросок: 3 c; быстрый — заметно короче, та же кривая. */
const ROLL_MS_NORMAL = 3200;
const ROLL_MS_FAST = 1250;
/** Быстрый старт, плавное замедление к концу для поставленного броска по keyframes. */
const ROLL_EASING = Easing.out(Easing.cubic);
/** iOS/Android: вращение на нативном потоке (без setState на кадр). Web: без native driver. */
const ROLL_USE_NATIVE_DRIVER = Platform.OS === 'ios' || Platform.OS === 'android';
const AUTO_ROLL_DELAY_MS = 1100;
const DICE_ROLL_SOUND: AVPlaybackSource = require('../../../assets/promos/dice-roll-sound-2.mp3');
/** Доп. полных оборотов: бросок должен выглядеть активным даже когда стартовая и итоговая грани совпали. */
const EXTRA_FULL_TURNS_MIN = 3;
const EXTRA_FULL_TURNS_MAX = 5;
/** Фиксированная высота зоны под результат (одинаковая для всех состояний). */
const RESULT_SLOT_H = 112;

const DICE_ICON_NAMES: Record<number, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  1: 'dice-1',
  2: 'dice-2',
  3: 'dice-3',
  4: 'dice-4',
  5: 'dice-5',
  6: 'dice-6',
};

type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

function rollDurationForFast(enabled: boolean): number {
  return enabled ? ROLL_MS_FAST : ROLL_MS_NORMAL;
}

const CUBE = 104;
const DICE_VIEWPORT = 150;
const ROLL_ROTATION_INPUT_RANGE = [0, 0.18, 0.42, 0.68, 0.88, 1];

type Euler = { x: number; y: number; z: number };

const FACE_FINAL: Record<DiceValue, Euler> = {
  1: { x: 0, y: 0, z: 0 },
  2: { x: 90, y: 0, z: 0 },
  3: { x: 0, y: -90, z: 0 },
  4: { x: 0, y: 90, z: 0 },
  5: { x: -90, y: 0, z: 0 },
  6: { x: 0, y: 180, z: 0 },
};

function randomDiceValue(): DiceValue {
  return (1 + Math.floor(Math.random() * 6)) as DiceValue;
}

function randomSign(): 1 | -1 {
  return Math.random() < 0.5 ? -1 : 1;
}

function randomExtraTurns(): number {
  return EXTRA_FULL_TURNS_MIN + Math.floor(Math.random() * (EXTRA_FULL_TURNS_MAX - EXTRA_FULL_TURNS_MIN + 1));
}

const DEG = Math.PI / 180;
const _d2r = (d: number) => d * DEG;
const _r2d = (r: number) => r / DEG;

/** Гамильтон: (w, x, y, z), совпадает с `transform: [rotateX, rotateY, rotateZ]` = R = Rz * Ry * Rx. */
type Quat = { w: number; x: number; y: number; z: number };

function quatNorm(q: Quat): Quat {
  const n = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n };
}

function eulerXyzDegToQuat(e: Euler): Quat {
  const x = _d2r(e.x);
  const y = _d2r(e.y);
  const z = _d2r(e.z);
  const cx = Math.cos(x * 0.5);
  const sx = Math.sin(x * 0.5);
  const cy = Math.cos(y * 0.5);
  const sy = Math.sin(y * 0.5);
  const cz = Math.cos(z * 0.5);
  const sz = Math.sin(z * 0.5);
  // qz * qy * qx
  return quatNorm({
    w: cx * cy * cz + sx * sy * sz,
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
  });
}

/**
 * К Ry*Rx, как у нас в RN (сначала X, потом Y, потом Z).
 * Источник: типичный ZYX Tait–Bryan → углы в градусах для тех же вращений.
 */
function quatXyzZyxToEulerDeg(q0: Quat): Euler {
  const { w, x, y, z } = quatNorm(q0);
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const ex = Math.atan2(sinr_cosp, cosr_cosp);
  const sinp = 2 * (w * y - z * x);
  let ey: number;
  if (Math.abs(sinp) >= 0.99999) {
    ey = Math.sign(sinp) * (Math.PI * 0.5);
  } else {
    ey = Math.asin(sinp);
  }
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const ez = Math.atan2(siny_cosp, cosy_cosp);
  return { x: _r2d(ex), y: _r2d(ey), z: _r2d(ez) };
}

function quatNlerp(a: Quat, b: Quat, t: number): Quat {
  return quatNorm({
    w: a.w + t * (b.w - a.w),
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    z: a.z + t * (b.z - a.z),
  });
}

function quatSlerp(a: Quat, b0: Quat, t: number): Quat {
  let b = b0;
  let cosHalf = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
  if (cosHalf < 0) {
    b = { w: -b.w, x: -b.x, y: -b.y, z: -b.z };
    cosHalf = -cosHalf;
  }
  if (cosHalf > 0.9995) {
    return quatNlerp(a, b, t);
  }
  const half = Math.acos(Math.min(1, Math.max(-1, cosHalf)));
  const s0 = Math.sin((1 - t) * half) / Math.sin(half);
  const s1 = Math.sin(t * half) / Math.sin(half);
  return quatNorm({
    w: a.w * s0 + b.w * s1,
    x: a.x * s0 + b.x * s1,
    y: a.y * s0 + b.y * s1,
    z: a.z * s0 + b.z * s1,
  });
}

function quatConj(q: Quat): Quat {
  return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
}

function quatFromAxisAngleRad(axis: { x: number; y: number; z: number }, angle: number): Quat {
  const l = Math.hypot(axis.x, axis.y, axis.z) || 1;
  const ax = axis.x / l;
  const ay = axis.y / l;
  const az = axis.z / l;
  const h = angle * 0.5;
  return quatNorm({ w: Math.cos(h), x: ax * Math.sin(h), y: ay * Math.sin(h), z: az * Math.sin(h) });
}

function quatToAxisAngleRel(q0: Quat): { axis: { x: number; y: number; z: number }; angle: number } {
  let q = quatNorm(q0);
  if (q.w < 0) q = { w: -q.w, x: -q.x, y: -q.y, z: -q.z };
  const w = Math.min(1, Math.max(-1, q.w));
  const angle = 2 * Math.acos(w);
  const s = Math.sin(angle * 0.5);
  if (s < 1e-5) {
    return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };
  }
  return { axis: { x: q.x / s, y: q.y / s, z: q.z / s }, angle };
}

/**
 * tLin 0…1 — нормированный прогресс (его скорость по времени задаёт ROLL_EASING).
 * Угол вдоль пути — линейно по tLin: быстрое вращение в начале и замедление в конце даёт
 * внешний ease-out. Без wobble — иначе кватернион→Эйлер даёт скачки и «ломается» текстура.
 */
function rollQuatForProgress(
  tLin: number,
  startEu: Euler,
  result: DiceValue,
  extraFullTurns: number,
  spinDirection: 1 | -1,
  tumbleAxis: { x: number; y: number; z: number },
  tumbleTurns: number,
): Quat {
  const qS = eulerXyzDegToQuat(startEu);
  const finalEu = FACE_FINAL[result];
  if (tLin >= 1) return eulerXyzDegToQuat(finalEu);
  if (tLin <= 0) return qS;
  const t = Math.max(0, Math.min(1, tLin));
  const s = t;
  const qE = eulerXyzDegToQuat(finalEu);
  const qRel = quatMult(qE, quatConj(qS));
  const { axis, angle } = quatToAxisAngleRel(qRel);
  const twoPi = Math.PI * 2;
  const fullExtra = twoPi * extraFullTurns * spinDirection;
  const totalAngle = angle + fullExtra;
  const qBase = Math.abs(totalAngle) < 1e-7 ? quatSlerp(qS, qE, s) : quatMult(quatFromAxisAngleRad(axis, totalAngle * s), qS);
  const tumbleEnvelope = Math.sin(Math.PI * s) ** 2;
  const tumbleAngle = twoPi * tumbleTurns * tumbleEnvelope;
  if (Math.abs(tumbleAngle) < 1e-7) return qBase;
  return quatMult(quatFromAxisAngleRad(tumbleAxis, tumbleAngle), qBase);
}

/** Hamilton product: применяем b, затем a — для v' = a·(b·v) как в RN [Rz][Ry][Rx]. */
function quatMult(a: Quat, b: Quat): Quat {
  return quatNorm({
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  });
}

function unwrapEulerFollow(prev: Euler, raw: Euler): Euler {
  let best = raw;
  let bestD = Number.POSITIVE_INFINITY;
  for (let kx = -3; kx <= 3; kx++) {
    for (let ky = -3; ky <= 3; ky++) {
      for (let kz = -3; kz <= 3; kz++) {
        const e: Euler = {
          x: raw.x + 360 * kx,
          y: raw.y + 360 * ky,
          z: raw.z + 360 * kz,
        };
        const d = (e.x - prev.x) ** 2 + (e.y - prev.y) ** 2 + (e.z - prev.z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
    }
  }
  return best;
}

type RollSpinPlan = {
  xTurns: number;
  yTurns: number;
  zTurns: number;
  xDirection: 1 | -1;
  yDirection: 1 | -1;
  zDirection: 1 | -1;
  wobbleX: number;
  wobbleY: number;
  wobbleZ: number;
};

function randomRollSpinPlan(): RollSpinPlan {
  const primary = randomSign();
  const secondary = randomSign();
  return {
    xTurns: 4 + Math.floor(Math.random() * 3),
    yTurns: 4 + Math.floor(Math.random() * 3),
    zTurns: 2 + Math.floor(Math.random() * 2),
    xDirection: primary,
    yDirection: secondary,
    zDirection: primary === secondary ? randomSign() : primary,
    wobbleX: 22 + Math.random() * 10,
    wobbleY: 20 + Math.random() * 10,
    wobbleZ: 16 + Math.random() * 8,
  };
}

function directedSpinAxisKeyframes(
  startDeg: number,
  endDeg: number,
  turns: number,
  direction: 1 | -1,
  wobbleDeg: number,
): number[] {
  const finalDeg = endDeg + 360 * turns * direction;
  const delta = finalDeg - startDeg;
  const sign: 1 | -1 = delta >= 0 ? 1 : -1;
  const stages = [0, 0.23, 0.48, 0.72, 0.9, 1];
  const lead = [0, 0.42, 0.12, 0.22, 0.05, 0];
  let prev = startDeg;
  return stages.map((stage, index) => {
    if (index === 0) return startDeg;
    if (index === stages.length - 1) return finalDeg;
    const raw = startDeg + delta * stage + sign * wobbleDeg * lead[index];
    const next =
      sign > 0
        ? Math.min(finalDeg, Math.max(prev, raw))
        : Math.max(finalDeg, Math.min(prev, raw));
    prev = next;
    return next;
  });
}

function cinematicKeyframes(start: Euler, end: Euler, plan: RollSpinPlan): Euler[] {
  const xs = directedSpinAxisKeyframes(start.x, end.x, plan.xTurns, plan.xDirection, plan.wobbleX);
  const ys = directedSpinAxisKeyframes(start.y, end.y, plan.yTurns, plan.yDirection, plan.wobbleY);
  const zs = directedSpinAxisKeyframes(start.z, end.z, plan.zTurns, plan.zDirection, plan.wobbleZ);
  return xs.map((x, index) => ({ x, y: ys[index], z: zs[index] }));
}

function interpolateKeyframes(progress: number, values: number[]): number {
  const t = Math.max(0, Math.min(1, progress));
  for (let i = 1; i < ROLL_ROTATION_INPUT_RANGE.length; i += 1) {
    const start = ROLL_ROTATION_INPUT_RANGE[i - 1];
    const end = ROLL_ROTATION_INPUT_RANGE[i];
    if (t > end) continue;
    const local = end === start ? 0 : (t - start) / (end - start);
    return values[i - 1] + (values[i] - values[i - 1]) * local;
  }
  return values[values.length - 1];
}

function rollEulerForProgress(progress: number, result: DiceValue, startEu: Euler, plan: RollSpinPlan): Euler {
  const keyframes = cinematicKeyframes(startEu, FACE_FINAL[result], plan);
  return {
    x: interpolateKeyframes(progress, keyframes.map((k) => k.x)),
    y: interpolateKeyframes(progress, keyframes.map((k) => k.y)),
    z: interpolateKeyframes(progress, keyframes.map((k) => k.z)),
  };
}

function RollingDice3D({ rx, ry, rz }: { rx: number; ry: number; rz: number }) {
  return (
    <View
      collapsable={false}
      style={{ width: DICE_VIEWPORT, height: DICE_VIEWPORT, alignItems: 'center', justifyContent: 'center' }}
    >
      <Dice3DView rx={rx} ry={ry} rz={rz} style={{ width: DICE_VIEWPORT, height: DICE_VIEWPORT }} />
    </View>
  );
}

const AnimatedRollingDice3D = React.memo(function AnimatedRollingDice3D({
  rollProgress,
  getEulerForProgress,
}: {
  rollProgress: Animated.Value;
  getEulerForProgress: (progress: number) => Euler;
}) {
  const [euler, setEuler] = useState<Euler>(() => getEulerForProgress(0));

  useEffect(() => {
    setEuler(getEulerForProgress(0));
    const listenerId = rollProgress.addListener(({ value }) => {
      setEuler(getEulerForProgress(value));
    });
    return () => {
      rollProgress.removeListener(listenerId);
    };
  }, [getEulerForProgress, rollProgress]);

  return <RollingDice3D rx={euler.x} ry={euler.y} rz={euler.z} />;
});

type Props = {
  visible: boolean;
  onClose: () => void;
  onLocalBonusChanged: () => void;
};

type Outcome = 'win' | 'lose' | null;

export function DiceMinigameModal({ visible, onClose, onLocalBonusChanged }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const bodyHeight = usePromoModalBodyHeight();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const [fastRoll, setFastRoll] = useState(false);
  const [autoRoll, setAutoRoll] = useState(false);
  const [pick, setPick] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [rolled, setRolled] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [rollsAvailable, setRollsAvailable] = useState(0);
  const [rollsAfterRound, setRollsAfterRound] = useState<number | null>(null);
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  const rollProgress = useRef(new Animated.Value(0)).current;
  const rollAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  /** Один бросок на весь цикл: и «перебор» граней, и итог — иначе последний кадр ≠ выпавшее число. */
  const rollResultRef = useRef<DiceValue | null>(null);
  /** Ориентация до броска: keyframes стартуют ровно с текущей видимой грани. */
  const rollStartEuRef = useRef<Euler>(FACE_FINAL[1]);
  /** План броска фиксируется на весь цикл, чтобы анимация не пересчитывала траекторию на рендерах. */
  const rollSpinPlanRef = useRef<RollSpinPlan>(randomRollSpinPlan());
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const onLocalBonusChangedRef = useRef(onLocalBonusChanged);
  onLocalBonusChangedRef.current = onLocalBonusChanged;
  const fastRollRef = useRef(fastRoll);
  fastRollRef.current = fastRoll;

  const settleScale = useRef(new Animated.Value(1)).current;
  const diceRollSoundRef = useRef<Audio.Sound | null>(null);
  const diceRollSoundLoadPromiseRef = useRef<Promise<Audio.Sound | null> | null>(null);
  const getEulerForProgress = useCallback((progress: number): Euler => {
    const result = (rollResultRef.current ?? 1) as DiceValue;
    return rollEulerForProgress(progress, result, rollStartEuRef.current, rollSpinPlanRef.current);
  }, []);

  const getDiceRollSound = useCallback(async () => {
    if (diceRollSoundRef.current) return diceRollSoundRef.current;
    if (diceRollSoundLoadPromiseRef.current) return diceRollSoundLoadPromiseRef.current;

    diceRollSoundLoadPromiseRef.current = Audio.Sound.createAsync(DICE_ROLL_SOUND, {
      shouldPlay: false,
      volume: 1,
    })
      .then(({ sound }) => {
        diceRollSoundRef.current = sound;
        return sound;
      })
      .catch(() => null)
      .finally(() => {
        diceRollSoundLoadPromiseRef.current = null;
      });

    return diceRollSoundLoadPromiseRef.current;
  }, []);

  const playDiceRollSound = useCallback(() => {
    void (async () => {
      try {
        const sound = await getDiceRollSound();
        if (!sound) return;
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch {
        // звук не должен блокировать бросок кубика
      }
    })();
  }, [getDiceRollSound]);

  const stopDiceRollSound = useCallback(() => {
    const sound = diceRollSoundRef.current;
    if (!sound) return;
    void sound.stopAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible) return;
    void (async () => {
      const p = await loadAppPreferences();
      setFastRoll(p.diceMinigameFastRoll);
      setAutoRoll(p.diceMinigameAutoRoll);
      setRollsAvailable(getDiceRollsTotalAvailable(p));
    })();
    void getDiceRollSound();
  }, [visible, getDiceRollSound]);

  useEffect(() => {
    return () => {
      const sound = diceRollSoundRef.current;
      diceRollSoundRef.current = null;
      if (sound) {
        void sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      rollResultRef.current = null;
      setRolling(false);
      setRolled(null);
      setOutcome(null);
      setRollsAfterRound(null);
      setPick(1);
      rollAnimRef.current?.stop();
      rollAnimRef.current = null;
      rollProgress.setValue(0);
      stopDiceRollSound();
    }
  }, [visible, rollProgress, stopDiceRollSound]);

  useEffect(() => {
    if (outcome == null && !rolling) {
      opacity.setValue(1);
      scale.setValue(1);
      translateY.setValue(0);
      return;
    }
    if (outcome == null) return;
    scale.setValue(0.96);
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: ROLL_USE_NATIVE_DRIVER, friction: 7, tension: 80 }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: ROLL_USE_NATIVE_DRIVER,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: ROLL_USE_NATIVE_DRIVER,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [outcome, rolling, opacity, scale, translateY]);

  const finishRoll = useCallback(() => {
    stopDiceRollSound();
    const value = rollResultRef.current ?? 1;
    const chosen = pickRef.current;
    setRolled(value);
    setRolling(false);
    if (value === chosen) {
      setOutcome('win');
      if (Platform.OS === 'android') {
        Vibration.vibrate(22);
      } else if (Platform.OS === 'ios') {
        Vibration.vibrate(16);
      }
      void (async () => {
        try {
          const cur = await loadAppPreferences();
          await patchAppPreferences({
            localPromoBonusRub: cur.localPromoBonusRub + DICE_MINIGAME_WIN_BONUS_RUB,
          });
          onLocalBonusChangedRef.current();
        } catch {
          // бонус не критичен для отображения исхода
        }
        const p = await loadAppPreferences();
        setRollsAfterRound(getDiceRollsTotalAvailable(p));
        setRollsAvailable(getDiceRollsTotalAvailable(p));
      })();
      return;
    }
    setOutcome('lose');
    if (Platform.OS === 'android') {
      Vibration.vibrate(20);
    } else if (Platform.OS === 'ios') {
      Vibration.vibrate(12);
    }
    void (async () => {
      const p = await loadAppPreferences();
      setRollsAfterRound(getDiceRollsTotalAvailable(p));
      setRollsAvailable(getDiceRollsTotalAvailable(p));
    })();
  }, []);

  const startRollAnimation = useCallback(
    (fromProgress: number, fullDurationMs: number) => {
      const progress = Math.max(0, Math.min(0.999, fromProgress));
      rollAnimRef.current?.stop();
      rollProgress.setValue(progress);
      const remainingDurationMs = Math.max(1, Math.round(fullDurationMs * (1 - progress)));
      const anim = Animated.timing(rollProgress, {
        toValue: 1,
        duration: remainingDurationMs,
        easing: ROLL_EASING,
        useNativeDriver: ROLL_USE_NATIVE_DRIVER,
      });
      rollAnimRef.current = anim;
      anim.start(({ finished }) => {
        if (!finished) return;
        finishRoll();
      });
    },
    [finishRoll, rollProgress],
  );

  useEffect(() => {
    if (!rolling) {
      rollAnimRef.current?.stop();
      rollAnimRef.current = null;
      rollProgress.setValue(0);
      return;
    }

    startRollAnimation(0, rollDurationForFast(fastRollRef.current));
    return () => {
      rollAnimRef.current?.stop();
    };
  }, [rolling, rollProgress, startRollAnimation]);

  /** Сдвиг по X: бросок «на стол» с дугой, без дрожи по пикселям. */
  /** Смещения минимальные, чтобы 3D-куб (диаг. ~1.4×CUBE) не вылезал за 168×168. */
  const shakeX = useMemo(
    () =>
      rollProgress.interpolate({
        inputRange: [0, 0.16, 0.38, 0.62, 0.82, 1],
        outputRange: [0, 11, -10, 7, -3, 0],
        extrapolate: 'clamp',
      }),
    [rollProgress],
  );
  const floatY = useMemo(
    () =>
      rollProgress.interpolate({
        inputRange: [0, 0.1, 0.28, 0.5, 0.7, 0.88, 1],
        outputRange: [0, -8, -24, -18, -9, 3, 0],
        extrapolate: 'clamp',
      }),
    [rollProgress],
  );
  /** Не scaleX/scaleY — с perspective+rotateZ это даёт разрыв сетки и «осколки». */
  const rollImpactScale = useMemo(
    () =>
      rollProgress.interpolate({
        inputRange: [0, 0.18, 0.45, 0.68, 0.86, 1],
        outputRange: [1, 1.075, 1.03, 0.965, 1.03, 1],
        extrapolate: 'clamp',
      }),
    [rollProgress],
  );
  const tableShadowScale = useMemo(
    () =>
      rollProgress.interpolate({
        inputRange: [0, 0.12, 0.35, 0.58, 0.82, 1],
        outputRange: [1, 0.72, 0.52, 0.66, 0.88, 1],
        extrapolate: 'clamp',
      }),
    [rollProgress],
  );
  const tableShadowOpacity = useMemo(
    () =>
      rollProgress.interpolate({
        inputRange: [0, 0.12, 0.35, 0.58, 0.82, 1],
        outputRange: [0.88, 0.62, 0.38, 0.52, 0.78, 0.88],
        extrapolate: 'clamp',
      }),
    [rollProgress],
  );

  useEffect(() => {
    if (rolling || rolled == null) return;
    settleScale.setValue(0.78);
    Animated.spring(settleScale, {
      toValue: 1,
      friction: 4,
      tension: 128,
      useNativeDriver: ROLL_USE_NATIVE_DRIVER,
    }).start();
  }, [rolling, rolled, settleScale]);

  const beginRoll = useCallback(() => {
    if (rolling) return;
    setRollsAfterRound(null);
    rollProgress.setValue(0);
    const startFace = (rolled != null ? rolled : 1) as DiceValue;
    rollStartEuRef.current = { ...FACE_FINAL[startFace] };
    rollSpinPlanRef.current = randomRollSpinPlan();
    rollResultRef.current = randomDiceValue();
    setRolling(true);
    setRolled(null);
    setOutcome(null);
    playDiceRollSound();
    if (Platform.OS === 'android') {
      Vibration.vibrate(35);
    } else if (Platform.OS === 'ios') {
      Vibration.vibrate(25);
    }
  }, [playDiceRollSound, rolling, rolled, rollProgress]);

  const runRoll = useCallback(() => {
    if (rolling) return;
    void (async () => {
      const p0 = await loadAppPreferences();
      const can = getDiceRollsTotalAvailable(p0);
      setRollsAvailable(can);
      if (can < 1) return;
      const ok = await tryConsumeOneDiceRoll();
      if (!ok) {
        const p1 = await loadAppPreferences();
        setRollsAvailable(getDiceRollsTotalAvailable(p1));
        return;
      }
      const p2 = await loadAppPreferences();
      setRollsAvailable(getDiceRollsTotalAvailable(p2));
      beginRoll();
    })();
  }, [beginRoll, rolling]);

  useEffect(() => {
    if (!visible || !autoRoll) return;
    if (outcome !== 'win' && outcome !== 'lose') return;
    if (rolling) return;
    if (rollsAvailable < 1) return;
    const t = setTimeout(() => {
      runRoll();
    }, AUTO_ROLL_DELAY_MS);
    return () => clearTimeout(t);
  }, [visible, autoRoll, outcome, rolling, runRoll, rollsAvailable]);

  const onToggleFast = useCallback(() => {
    const next = !fastRoll;
    fastRollRef.current = next;
    setFastRoll(next);
    void patchAppPreferences({ diceMinigameFastRoll: next });
    if (rolling) {
      rollProgress.stopAnimation((value) => {
        startRollAnimation(value, rollDurationForFast(next));
      });
    }
  }, [fastRoll, rolling, rollProgress, startRollAnimation]);

  const onToggleAuto = useCallback(() => {
    const next = !autoRoll;
    setAutoRoll(next);
    void patchAppPreferences({ diceMinigameAutoRoll: next });
  }, [autoRoll]);

  const title = t(PROMO_VISUAL.dice.i18nTitle);
  const idleFace = (rolled != null ? rolled : 1) as DiceValue;
  const idleDieEuler = FACE_FINAL[idleFace];

  const cardShell = (children: React.ReactNode, borderColor: string, accent: string, cardBg: string = colors.card) => (
    <Animated.View
      style={[
        styles.resultCard,
        { borderColor, minHeight: RESULT_SLOT_H, backgroundColor: cardBg },
        outcome != null && { opacity, transform: [{ scale }, { translateY }] },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.resultAccent, { backgroundColor: accent }]} />
      {children}
    </Animated.View>
  );

  const idleSub = rollsAvailable < 1 ? t('promo.diceIdleSubNoRolls') : t('promo.diceIdleSub');
  const loseSub =
    rollsAfterRound != null && rollsAfterRound < 1 ? t('promo.diceLoseSubNoMore') : t('promo.diceLoseSub');

  const idleCard = cardShell(
    <View style={styles.resultInner}>
      <View style={[styles.resultIconCircle, { backgroundColor: colors.chipOn }]}>
        <MaterialCommunityIcons name="dice-5" size={30} color={colors.text} />
      </View>
      <View style={styles.resultTextBlock}>
        <Text style={styles.resultTitleIdle}>{t('promo.diceIdleTitle')}</Text>
        <Text style={styles.resultSubIdle}>{idleSub}</Text>
      </View>
    </View>,
    colors.borderLight,
    colors.muted,
  );

  const rollingCard = cardShell(
    <View style={styles.resultInner}>
      <View style={[styles.resultIconCircle, { backgroundColor: `${colors.accentBright}22` }]}>
        <MaterialCommunityIcons name="dice-5" size={30} color={colors.accentBright} />
      </View>
      <View style={styles.resultTextBlock}>
        <Text style={styles.resultTitleRolling}>{t('promo.diceRolling')}</Text>
        <Text style={styles.resultSubRolling}> </Text>
      </View>
    </View>,
    colors.accentBright,
    colors.accent,
  );

  const winCard = cardShell(
    <View style={styles.resultInner}>
      <View style={[styles.resultIconCircle, { backgroundColor: `${colors.success}22` }]}>
        {rolled != null && (
          <MaterialCommunityIcons
            name={DICE_ICON_NAMES[rolled] ?? 'dice-5'}
            size={30}
            color={colors.success}
          />
        )}
      </View>
      <View style={styles.resultTextBlock}>
        <Text style={styles.resultTitleWin}>{t('promo.diceWinTitle')}</Text>
        <Text style={styles.resultSubWin}>
          {t('promo.diceWinSub', { amount: DICE_MINIGAME_WIN_BONUS_RUB })}
        </Text>
      </View>
    </View>,
    colors.success,
    colors.success,
  );

  const loseCard = cardShell(
    <View style={styles.resultInner}>
      <View style={[styles.resultIconCircle, { backgroundColor: colors.chipOn }]}>
        {rolled != null && (
          <MaterialCommunityIcons
            name={DICE_ICON_NAMES[rolled] ?? 'dice-5'}
            size={30}
            color={colors.muted}
          />
        )}
      </View>
      <View style={styles.resultTextBlock}>
        <Text style={styles.resultTitleNeutral}>{t('promo.diceLoseTitle')}</Text>
        <Text style={styles.resultSubNeutral}>{loseSub}</Text>
      </View>
    </View>,
    colors.borderLight,
    colors.muted,
    colors.chipOn,
  );

  const resultBlock = rolling
    ? rollingCard
    : outcome === 'win'
      ? winCard
      : outcome === 'lose'
        ? loseCard
        : idleCard;

  return (
    <CenteredCardModal visible={visible} title={title} onClose={onClose} noScroll bodyHeight={bodyHeight}>
      <View style={styles.bodyRoot}>
        <View style={styles.gameSection}>
          <View style={styles.resultSlot}>{resultBlock}</View>

          <View style={styles.gameBlock}>
            <Text style={styles.rollsAvailableLine}>
              {t('promo.diceAvailableLine', { n: rollsAvailable })}
            </Text>
            <Text style={styles.pickerLabel}>{t('promo.dicePickLabel')}</Text>
            <View style={styles.nums}>
              {([1, 2, 3, 4, 5, 6] as const).map((n) => {
                const on = n === pick;
                return (
                  <Pressable
                    key={n}
                    onPress={() => {
                      if (rolling) return;
                      setPick(n);
                      setOutcome(null);
                      setRolled(null);
                    }}
                    style={({ pressed }) => [
                      styles.numChip,
                      {
                        borderColor: on ? colors.accentBright : colors.border,
                        backgroundColor: on ? colors.accentDim : colors.card,
                      },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={[styles.numText, { color: on ? colors.accentBright : colors.text }]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.diceRow}>
              <View style={styles.diceBox} removeClippedSubviews={false}>
                {rolling ? (
                  <Animated.View
                    style={[
                      styles.diceDropShadow,
                      {
                        opacity: tableShadowOpacity,
                        pointerEvents: 'none',
                        transform: [{ scale: tableShadowScale }],
                      },
                    ]}
                  />
                ) : (
                  <View style={styles.diceDropShadow} />
                )}
                {rolling ? (
                  <Animated.View
                    style={[
                      styles.rollingBox,
                      {
                        transform: [
                          { translateX: shakeX },
                          { translateY: floatY },
                          { scale: rollImpactScale },
                        ],
                      },
                    ]}
                  >
                    <AnimatedRollingDice3D rollProgress={rollProgress} getEulerForProgress={getEulerForProgress} />
                  </Animated.View>
                ) : (
                  <Animated.View
                    style={[
                      styles.rollingBox,
                      { transform: [{ scale: settleScale }] },
                    ]}
                  >
                    <RollingDice3D rx={idleDieEuler.x} ry={idleDieEuler.y} rz={idleDieEuler.z} />
                  </Animated.View>
                )}
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.rollBtn,
                (pressed || rolling || rollsAvailable < 1) && { opacity: 0.9 },
                rollsAvailable < 1 && { opacity: 0.5 },
              ]}
              onPress={runRoll}
              disabled={rolling || rollsAvailable < 1}
              accessibilityRole="button"
              accessibilityLabel={rollsAvailable < 1 ? t('promo.diceNoRolls') : t('promo.diceRoll')}
            >
              <MaterialCommunityIcons name="dice-5" size={22} color={colors.accentTextOnButton} />
              <Text style={styles.rollText}>
                {rollsAvailable < 1 ? t('promo.diceNoRolls') : t('promo.diceRoll')}
              </Text>
            </Pressable>

            <View style={styles.settingsRow}>
              <Pressable
                onPress={onToggleFast}
                style={({ pressed }) => [
                  styles.setChip,
                  {
                    borderColor: fastRoll ? colors.accentBright : colors.border,
                    backgroundColor: fastRoll ? colors.accentDim : colors.card,
                  },
                  pressed && { opacity: 0.9 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: fastRoll }}
                accessibilityLabel={t('promo.diceToggleFast')}
              >
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={22}
                  color={fastRoll ? colors.accentBright : colors.muted}
                />
              </Pressable>
              <Pressable
                onPress={onToggleAuto}
                style={({ pressed }) => [
                  styles.setChip,
                  {
                    borderColor: autoRoll ? colors.accentBright : colors.border,
                    backgroundColor: autoRoll ? colors.accentDim : colors.card,
                  },
                  pressed && { opacity: 0.9 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: autoRoll }}
                accessibilityLabel={t('promo.diceToggleAuto')}
              >
                <MaterialCommunityIcons
                  name={autoRoll ? 'autorenew' : 'gesture-tap'}
                  size={22}
                  color={autoRoll ? colors.accentBright : colors.muted}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.rulesBlock}>
            <Text style={styles.rulesTitle}>{t('promo.diceRulesTitle')}</Text>
            <Text style={styles.rulesBody}>{t('promo.diceIntro')}</Text>
          </View>
        </View>
      </View>
    </CenteredCardModal>
  );
}

function createStyles(colors: ColorPalette, safeBottomInset: number) {
  return StyleSheet.create({
    bodyRoot: {
      width: '100%',
      flex: 1,
      minHeight: 0,
      flexDirection: 'column',
      justifyContent: 'flex-start',
    },
    rulesBlock: {
      width: '100%',
      flexShrink: 0,
      marginTop: 6,
      paddingVertical: 8,
      paddingHorizontal: 6,
    },
    rulesTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    rulesBody: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
      opacity: 0.9,
      textAlign: 'center',
    },
    gameSection: {
      width: '100%',
      justifyContent: 'space-between',
      flex: 1,
      minHeight: 0,
      paddingTop: 2,
      paddingBottom: Math.max(8, safeBottomInset > 0 ? 2 : 0),
    },
    resultSlot: {
      minHeight: RESULT_SLOT_H,
      width: '100%',
      marginBottom: 0,
      justifyContent: 'center',
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 12,
      marginBottom: 0,
    },
    setChip: {
      width: 48,
      height: 48,
      borderRadius: 14,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultCard: {
      flexDirection: 'row',
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    resultAccent: { width: 4 },
    resultInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingRight: 14,
      paddingLeft: 12,
      gap: 12,
    },
    resultIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultTextBlock: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
    resultTitleWin: { fontSize: 17, fontWeight: '800', color: colors.success, marginBottom: 2 },
    resultSubWin: { fontSize: 14, lineHeight: 20, color: colors.text, opacity: 0.92 },
    resultTitleIdle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
    resultSubIdle: { fontSize: 14, lineHeight: 20, color: colors.muted },
    resultTitleRolling: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
    resultSubRolling: { fontSize: 14, lineHeight: 20, color: 'transparent' },
    resultTitleNeutral: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
    resultSubNeutral: { fontSize: 14, lineHeight: 20, color: colors.muted },
    gameBlock: { width: '100%', flexShrink: 0, marginTop: 10, gap: 0, paddingBottom: 0 },
    rollsAvailableLine: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
      textAlign: 'center',
      color: colors.text,
      opacity: 0.9,
      marginBottom: 2,
    },
    pickerLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 8, letterSpacing: 0.2 },
    nums: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, justifyContent: 'center' },
    numChip: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: { fontSize: 18, fontWeight: '800' },
    diceRow: { alignItems: 'center', marginBottom: 10 },
    diceBox: {
      position: 'relative',
      width: 168,
      height: 168,
      borderRadius: 24,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    },
    diceDropShadow: {
      position: 'absolute',
      bottom: 16,
      left: 38,
      width: 92,
      height: 12,
      borderRadius: 46,
      backgroundColor: 'rgba(0,0,0,0.2)',
      zIndex: 0,
    },
    rollingBox: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, width: '100%', height: '100%', zIndex: 1 },
    rollBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 2,
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 12,
      minHeight: 48,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
        },
        android: { elevation: 4 },
        web: { boxShadow: '0 4px 6px rgba(0,0,0,0.25)' },
        default: {},
      }),
    },
    rollText: { color: colors.accentTextOnButton, fontWeight: '800', fontSize: 16, lineHeight: 20 },
  });
}
