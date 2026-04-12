import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocale } from '../../i18n/LocaleContext';
import type { StructRoom } from '../../api/types';
import {
  getHallMapPcNudgePx,
  getHallMapPcScaleFromEnv,
  getHallMapZoneNudgePx,
  getHallMapZoneXYScaleFromEnv,
  type ClubLayoutAxisScale,
} from '../../config/clubLayoutConfig';
import type { ColorPalette } from '../../theme/palettes';
import {
  areaFrameExtentHeight,
  coerceLayoutNum,
  globalScaleForRooms,
  pcOffsetsInZonePixels,
  type PcAvailabilityState,
} from './clubLayoutGeometry';

function hexColor(raw: string | undefined, fallback: string): string {
  if (!raw?.trim()) return fallback;
  const s = raw.trim();
  return s.startsWith('#') ? s : `#${s}`;
}

/** Когда API не задаёт `color_border` (часто у GameZone), даём ту же золотистую обводку, что у соседних зон. */
const ZONE_BORDER_FALLBACK = '#d4af37';

/** Полоса под заголовок зоны, чтобы чипы ПК не перекрывали название. */
const ZONE_TITLE_INSET_PX = 22;

const AXIS_COEF_STEP = 0.05;
const AXIS_COEF_MIN = 0.05;
const AXIS_COEF_MAX = 5;

function clampAxisUserCoef(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(AXIS_COEF_MAX, Math.max(AXIS_COEF_MIN, n));
}

function parseImportedPositive(n: unknown, fb: number): number {
  if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n;
  return fb;
}

/** Стабильный ключ зоны в списке structRooms (порядок + имя). */
function makeZoneKey(room: StructRoom, idx: number): string {
  return `${idx}|${room.area_name ?? ''}`;
}

const DEFAULT_XY: { x: number; y: number } = { x: 1, y: 1 };

function getZoneXY(map: Record<string, { x: number; y: number }>, key: string): { x: number; y: number } {
  const v = map[key];
  if (!v) return { ...DEFAULT_XY };
  return {
    x: clampAxisUserCoef(v.x),
    y: clampAxisUserCoef(v.y),
  };
}

export type ClubLayoutCanvasProps = {
  rooms: StructRoom[];
  colors: ColorPalette;
  /** iCafe id клуба — для сброса правок и метки в экспорте JSON */
  icafeId?: number;
  /** pc_name -> состояние для подсветки (бронь); если нет ключа — unknown */
  pcAvailability?: Record<string, PcAvailabilityState>;
  onPcPress?: (pcName: string) => void;
  /** Отступы контейнера по горизонтали (по умолчанию 32) */
  horizontalPadding?: number;
  minHeight?: number;
  /** Сдвиг холста (px): EXPO_PUBLIC_HALL_MAP_OFFSET_* и EXPO_PUBLIC_HALL_MAP_CLUB_OFFSETS_JSON */
  layoutOffsetPx?: { x: number; y: number };
  /**
   * Поправка «кривых» координат iCafe по осям после базового `scale = canvasW/maxX`.
   * См. `getHallMapAxisScaleForClub` / EXPO_PUBLIC_HALL_MAP_AXIS_SCALE_*.
   */
  axisScale?: ClubLayoutAxisScale;
};

export function ClubLayoutCanvas({
  rooms,
  colors,
  icafeId,
  pcAvailability,
  onPcPress,
  horizontalPadding = 32,
  minHeight = 280,
  layoutOffsetPx,
  axisScale,
}: ClubLayoutCanvasProps) {
  const { t } = useLocale();
  const { width: windowW } = useWindowDimensions();
  const [measuredW, setMeasuredW] = useState<number | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0, px: 0, py: 0 });

  /** Режим правки: перетаскивание зон/ПК, без общего pan карты. */
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  /** Доп. сдвиг зоны в px (на холсте), поверх API + env nudge. */
  const [zoneDragPx, setZoneDragPx] = useState<Record<string, { x: number; y: number }>>({});
  /** Доп. сдвиг чипа ПК в px. */
  const [pcDragPx, setPcDragPx] = useState<Record<string, { x: number; y: number }>>({});
  /** Абсолютный масштаб чипа (1 = по умолчанию), для экспорта в HALL_MAP_PC_SCALE_JSON. */
  const [pcScaleAbs, setPcScaleAbs] = useState<Record<string, number>>({});
  const [pcScaleInput, setPcScaleInput] = useState<Record<string, string>>({});

  /** Поправка к `axisScale` по каждой зоне отдельно: множители по X и Y. */
  const [zoneXYCoef, setZoneXYCoef] = useState<Record<string, { x: number; y: number }>>({});
  const [zoneXYCoefInput, setZoneXYCoefInput] = useState<Record<string, { sx: string; sy: string }>>({});

  const [importJsonText, setImportJsonText] = useState('');

  const axisScaleBaseline = `${axisScale?.x ?? 1},${axisScale?.y ?? 1}`;
  const roomsLayoutKey = useMemo(
    () => rooms.map((r, i) => `${i}|${r.area_name ?? ''}|${r.area_frame_width}`).join(';'),
    [rooms],
  );

  const layoutSessionKey = `${icafeId ?? 0}|${axisScaleBaseline}|${roomsLayoutKey}`;

  useEffect(() => {
    setZoneDragPx({});
    setPcDragPx({});
    setPan({ x: 0, y: 0 });
    setLayoutEditMode(false);
    setImportJsonText('');
    const nextXY: Record<string, { x: number; y: number }> = {};
    const nextIn: Record<string, { sx: string; sy: string }> = {};
    const nextPcS: Record<string, number> = {};
    const nextPcIn: Record<string, string> = {};
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i]!;
      const zk = makeZoneKey(r, i);
      const b = getHallMapZoneXYScaleFromEnv(r.area_name);
      nextXY[zk] = { x: b.x, y: b.y };
      nextIn[zk] = { sx: String(b.x), sy: String(b.y) };
      for (const pc of r.pcs_list ?? []) {
        const name = pc.pc_name;
        const sc = getHallMapPcScaleFromEnv(name);
        nextPcS[name] = sc;
        nextPcIn[name] = String(sc);
      }
    }
    setZoneXYCoef(nextXY);
    setZoneXYCoefInput(nextIn);
    setPcScaleAbs(nextPcS);
    setPcScaleInput(nextPcIn);
  }, [layoutSessionKey, rooms]);

  const baseKx = axisScale?.x ?? 1;
  const baseKy = axisScale?.y ?? 1;

  const bumpZoneAxis = useCallback((zoneKey: string, axis: 'x' | 'y', dir: -1 | 1) => {
    setZoneXYCoef((prev) => {
      const cur = getZoneXY(prev, zoneKey);
      const nextAxis = clampAxisUserCoef(
        Math.round((cur[axis] + dir * AXIS_COEF_STEP) * 1000) / 1000,
      );
      const next = { ...cur, [axis]: nextAxis };
      queueMicrotask(() => {
        setZoneXYCoefInput((pin) => ({
          ...pin,
          [zoneKey]: { sx: String(next.x), sy: String(next.y) },
        }));
      });
      return { ...prev, [zoneKey]: next };
    });
  }, []);

  const onZoneAxisCoefChangeText = useCallback((zoneKey: string, axis: 'x' | 'y', text: string) => {
    setZoneXYCoefInput((prev) => ({
      ...prev,
      [zoneKey]: {
        ...(prev[zoneKey] ?? { sx: '1', sy: '1' }),
        [axis === 'x' ? 'sx' : 'sy']: text,
      },
    }));
    const normalized = text.trim().replace(',', '.');
    if (normalized === '' || normalized === '.' || normalized === '-') return;
    const parsed = parseFloat(normalized);
    if (Number.isFinite(parsed) && parsed > 0) {
      setZoneXYCoef((prev) => {
        const cur = getZoneXY(prev, zoneKey);
        const next = { ...cur, [axis]: clampAxisUserCoef(parsed) };
        return { ...prev, [zoneKey]: next };
      });
    }
  }, []);

  const bumpAllZoneAxisCoef = useCallback(
    (dir: -1 | 1) => {
      setZoneXYCoef((prevCoef) => {
        const next = { ...prevCoef };
        for (let i = 0; i < rooms.length; i++) {
          const k = makeZoneKey(rooms[i]!, i);
          const cur = getZoneXY(next, k);
          next[k] = {
            x: clampAxisUserCoef(Math.round((cur.x + dir * AXIS_COEF_STEP) * 1000) / 1000),
            y: clampAxisUserCoef(Math.round((cur.y + dir * AXIS_COEF_STEP) * 1000) / 1000),
          };
        }
        queueMicrotask(() => {
          setZoneXYCoefInput((prevIn) => {
            const nextIn = { ...prevIn };
            for (let i = 0; i < rooms.length; i++) {
              const k = makeZoneKey(rooms[i]!, i);
              const v = next[k] ?? DEFAULT_XY;
              nextIn[k] = { sx: String(v.x), sy: String(v.y) };
            }
            return nextIn;
          });
        });
        return next;
      });
    },
    [rooms],
  );

  const resetAllZoneAxisCoefAndPan = useCallback(() => {
    const nextXY: Record<string, { x: number; y: number }> = {};
    const nextIn: Record<string, { sx: string; sy: string }> = {};
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i]!;
      const zk = makeZoneKey(r, i);
      const b = getHallMapZoneXYScaleFromEnv(r.area_name);
      nextXY[zk] = { x: b.x, y: b.y };
      nextIn[zk] = { sx: String(b.x), sy: String(b.y) };
    }
    setZoneXYCoef(nextXY);
    setZoneXYCoefInput(nextIn);
    setZoneDragPx({});
    setPcDragPx({});
    const nextPcS: Record<string, number> = {};
    const nextPcIn: Record<string, string> = {};
    for (const r of rooms) {
      for (const pc of r.pcs_list ?? []) {
        const sc = getHallMapPcScaleFromEnv(pc.pc_name);
        nextPcS[pc.pc_name] = sc;
        nextPcIn[pc.pc_name] = String(sc);
      }
    }
    setPcScaleAbs(nextPcS);
    setPcScaleInput(nextPcIn);
    setPan({ x: 0, y: 0 });
  }, [rooms]);

  const zoneDragStart = useRef<Record<string, { x: number; y: number }>>({});
  const pcDragStart = useRef<Record<string, { x: number; y: number }>>({});
  const zoneDragPxRef = useRef(zoneDragPx);
  zoneDragPxRef.current = zoneDragPx;
  const pcDragPxRef = useRef(pcDragPx);
  pcDragPxRef.current = pcDragPx;

  const onPcScaleChangeText = useCallback((pcName: string, text: string) => {
    setPcScaleInput((prev) => ({ ...prev, [pcName]: text }));
    const normalized = text.trim().replace(',', '.');
    if (normalized === '' || normalized === '.' || normalized === '-') return;
    const parsed = parseFloat(normalized);
    if (Number.isFinite(parsed) && parsed > 0) {
      const clamped = Math.min(2.5, Math.max(0.35, parsed));
      setPcScaleAbs((prev) => ({ ...prev, [pcName]: clamped }));
    }
  }, []);

  const buildExportPayload = useCallback(() => {
    const zoneOffsets: Record<string, { x: number; y: number }> = {};
    const zoneXY: Record<string, { x: number; y: number }> = {};
    const pcOff: Record<string, { x: number; y: number }> = {};
    const pcSc: Record<string, number> = {};

    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i]!;
      const zk = makeZoneKey(r, i);
      const name = r.area_name || `zone_${i}`;
      const staticNudge = getHallMapZoneNudgePx(r.area_name);
      const drag = zoneDragPx[zk] ?? { x: 0, y: 0 };
      zoneOffsets[name] = { x: staticNudge.x + drag.x, y: staticNudge.y + drag.y };
      const xy = getZoneXY(zoneXYCoef, zk);
      zoneXY[name] = { x: xy.x, y: xy.y };
    }

    for (const r of rooms) {
      for (const pc of r.pcs_list ?? []) {
        const envN = getHallMapPcNudgePx(pc.pc_name);
        const drag = pcDragPx[pc.pc_name] ?? { x: 0, y: 0 };
        pcOff[pc.pc_name] = { x: envN.x + drag.x, y: envN.y + drag.y };
        pcSc[pc.pc_name] = pcScaleAbs[pc.pc_name] ?? getHallMapPcScaleFromEnv(pc.pc_name);
      }
    }

    const zoneDragExport: Record<string, { x: number; y: number }> = {};
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i]!;
      const zk = makeZoneKey(r, i);
      zoneDragExport[zk] = zoneDragPx[zk] ?? { x: 0, y: 0 };
    }

    return {
      _v: 1 as const,
      icafe_id: icafeId ?? null,
      pan,
      zone_drag_px: zoneDragExport,
      pc_drag_px: pcDragPx,
      zone_xy: zoneXY,
      pc_scale: pcSc,
      env: {
        EXPO_PUBLIC_HALL_MAP_ZONE_OFFSETS_JSON: JSON.stringify(zoneOffsets),
        EXPO_PUBLIC_HALL_MAP_ZONE_XY_SCALE_JSON: JSON.stringify(zoneXY),
        EXPO_PUBLIC_HALL_MAP_PC_OFFSETS_JSON: JSON.stringify(pcOff),
        EXPO_PUBLIC_HALL_MAP_PC_SCALE_JSON: JSON.stringify(pcSc),
      },
      notes:
        'Подставьте значения env в .env или попросите ассистента обновить clubLayoutConfig. Ключи зон — имена из API; ПК — как в struct. Поля zone_drag_px / pc_drag_px — для повторного импорта сессии.',
    };
  }, [rooms, icafeId, pan, zoneDragPx, zoneXYCoef, pcDragPx, pcScaleAbs]);

  const onExportShare = useCallback(() => {
    const payload = buildExportPayload();
    const text = JSON.stringify(payload, null, 2);
    void Share.share({ message: text, title: 'Hall map layout' }).catch(() => {});
  }, [buildExportPayload]);

  const onApplyImport = useCallback(() => {
    const raw = importJsonText.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        pan?: { x?: number; y?: number };
        zone_drag_px?: Record<string, { x?: number; y?: number }>;
        pc_drag_px?: Record<string, { x?: number; y?: number }>;
        zone_xy?: Record<string, { x?: number; y?: number }>;
        pc_scale?: Record<string, number>;
      };
      if (parsed.pan && typeof parsed.pan.x === 'number' && typeof parsed.pan.y === 'number') {
        setPan({ x: parsed.pan.x, y: parsed.pan.y });
      }
      if (parsed.zone_drag_px && typeof parsed.zone_drag_px === 'object') {
        const next: Record<string, { x: number; y: number }> = {};
        for (const [k, v] of Object.entries(parsed.zone_drag_px)) {
          const zk = k;
          if (v && typeof v === 'object') {
            next[zk] = {
              x: typeof v.x === 'number' && Number.isFinite(v.x) ? v.x : 0,
              y: typeof v.y === 'number' && Number.isFinite(v.y) ? v.y : 0,
            };
          }
        }
        setZoneDragPx((prev) => ({ ...prev, ...next }));
      }
      if (parsed.pc_drag_px && typeof parsed.pc_drag_px === 'object') {
        const next: Record<string, { x: number; y: number }> = {};
        for (const [k, v] of Object.entries(parsed.pc_drag_px)) {
          if (v && typeof v === 'object') {
            next[k] = {
              x: typeof v.x === 'number' && Number.isFinite(v.x) ? v.x : 0,
              y: typeof v.y === 'number' && Number.isFinite(v.y) ? v.y : 0,
            };
          }
        }
        setPcDragPx((prev) => ({ ...prev, ...next }));
      }
      if (parsed.zone_xy && typeof parsed.zone_xy === 'object') {
        setZoneXYCoef((prev) => {
          const merged = { ...prev };
          for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i]!;
            const zk = makeZoneKey(r, i);
            const name = r.area_name || `zone_${i}`;
            const row = parsed.zone_xy![name] ?? parsed.zone_xy![zk];
            if (row && typeof row === 'object') {
              merged[zk] = {
                x: clampAxisUserCoef(parseImportedPositive(row.x, 1)),
                y: clampAxisUserCoef(parseImportedPositive(row.y, 1)),
              };
            }
          }
          queueMicrotask(() => {
            setZoneXYCoefInput((pin) => {
              const nextIn = { ...pin };
              for (let i = 0; i < rooms.length; i++) {
                const zk = makeZoneKey(rooms[i]!, i);
                const v = merged[zk];
                if (v) nextIn[zk] = { sx: String(v.x), sy: String(v.y) };
              }
              return nextIn;
            });
          });
          return merged;
        });
      }
      if (parsed.pc_scale && typeof parsed.pc_scale === 'object') {
        setPcScaleAbs((prev) => {
          const n = { ...prev };
          for (const [k, v] of Object.entries(parsed.pc_scale!)) {
            const num = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
            if (Number.isFinite(num) && num > 0) n[k] = num;
          }
          return n;
        });
        queueMicrotask(() => {
          setPcScaleInput((pin) => {
            const next = { ...pin };
            for (const [k, v] of Object.entries(parsed.pc_scale!)) {
              const num = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
              if (Number.isFinite(num) && num > 0) next[k] = String(num);
            }
            return next;
          });
        });
      }
    } catch {
      /* ignore */
    }
  }, [importJsonText, rooms]);

  const onMeasure = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Number.isFinite(w)) setMeasuredW(w);
  }, []);

  const canvasW = measuredW ?? Math.max(200, windowW - horizontalPadding);

  /**
   * Общий bbox API: одна глобальная шкала `canvasW / maxX`, чтобы узкие колонки (Bootcamp / VIP)
   * не раздувались на всю ширину экрана. Поправочный коэффициент задаётся **по каждой зоне** —
   * соседние зоны при подгонке одной не смещаются.
   */
  const layout = useMemo(() => {
    const s = globalScaleForRooms(rooms, canvasW);
    let maxBottomPx = 0;
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i]!;
      const zk = makeZoneKey(r, i);
      const bottomLogical = coerceLayoutNum(r.area_frame_height);
      const zxy = getZoneXY(zoneXYCoef, zk);
      const ky = baseKy * zxy.y;
      const nudge = getHallMapZoneNudgePx(r.area_name);
      const dragY = zoneDragPx[zk]?.y ?? 0;
      const pixelBottom = bottomLogical * s * ky + nudge.y + dragY;
      maxBottomPx = Math.max(maxBottomPx, pixelBottom);
    }
    const h = rooms.length ? Math.max(minHeight, maxBottomPx) : minHeight;
    return { canvasH: h, scale: s };
  }, [rooms, canvasW, minHeight, baseKy, zoneXYCoef, zoneDragPx]);

  const viewportMaxH = Math.min(520, Math.max(280, layout.canvasH + 48));
  const panRef = useRef(pan);
  panRef.current = pan;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          !layoutEditMode && (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5),
        onPanResponderTerminationRequest: () => true,
        onPanResponderGrant: () => {
          panOrigin.current = { x: 0, y: 0, px: panRef.current.x, py: panRef.current.y };
        },
        onPanResponderMove: (_, g) => {
          setPan({
            x: panOrigin.current.px + g.dx,
            y: panOrigin.current.py + g.dy,
          });
        },
      }),
    [layoutEditMode],
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  const allPcsList = useMemo(() => {
    const out: { pcName: string; zoneLabel: string }[] = [];
    for (const r of rooms) {
      for (const pc of r.pcs_list ?? []) {
        out.push({ pcName: pc.pc_name, zoneLabel: r.area_name ?? '' });
      }
    }
    return out;
  }, [rooms]);

  return (
    <View style={styles.measureOuter} onLayout={onMeasure}>
      <View style={styles.coefHeader}>
        <Text style={styles.coefTitle} numberOfLines={2}>
          {t('hallMap.zoneCoefTitle')}
        </Text>
        <View style={styles.coefRowAll}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('hallMap.layoutEditToggle')}
            hitSlop={6}
            onPress={() => setLayoutEditMode((v) => !v)}
            style={({ pressed }) => [
              styles.editModeBtn,
              layoutEditMode && styles.editModeBtnOn,
              pressed && styles.coefBtnPressed,
            ]}
          >
            <Text style={[styles.editModeBtnText, layoutEditMode && styles.editModeBtnTextOn]}>
              {layoutEditMode ? t('hallMap.layoutEditOn') : t('hallMap.layoutEditOff')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('hallMap.exportLayout')}
            hitSlop={6}
            onPress={onExportShare}
            style={({ pressed }) => [styles.coefBtn, pressed && styles.coefBtnPressed]}
          >
            <Text style={styles.coefBtnText}>⎘</Text>
          </Pressable>
        </View>
        <View style={styles.coefRowAll}>
          <Text style={styles.coefAllLabel} numberOfLines={1}>
            {t('hallMap.axisCoefAll')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('hallMap.axisCoefAllDecrease')}
            hitSlop={6}
            onPress={() => bumpAllZoneAxisCoef(-1)}
            style={({ pressed }) => [styles.coefBtn, pressed && styles.coefBtnPressed]}
          >
            <Text style={styles.coefBtnText}>−</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('hallMap.axisCoefAllIncrease')}
            hitSlop={6}
            onPress={() => bumpAllZoneAxisCoef(1)}
            style={({ pressed }) => [styles.coefBtn, pressed && styles.coefBtnPressed]}
          >
            <Text style={styles.coefBtnText}>+</Text>
          </Pressable>
        </View>
      </View>
      {layoutEditMode ? (
        <Text style={styles.editHint} numberOfLines={3}>
          {t('hallMap.layoutEditHint')}
        </Text>
      ) : null}
      <ScrollView
        style={styles.zoneCoefScroll}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={rooms.length > 4}
      >
        {rooms.map((r, idx) => {
          const zk = makeZoneKey(r, idx);
          const ins = zoneXYCoefInput[zk] ?? {
            sx: String(getZoneXY(zoneXYCoef, zk).x),
            sy: String(getZoneXY(zoneXYCoef, zk).y),
          };
          return (
            <View key={zk} style={styles.zoneCoefRow}>
              <Text style={styles.zoneCoefName} numberOfLines={1}>
                {r.area_name || `—${idx}`}
              </Text>
              <Text style={styles.axisMini}>Sx</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('hallMap.axisCoefDecrease')}
                hitSlop={4}
                onPress={() => bumpZoneAxis(zk, 'x', -1)}
                style={({ pressed }) => [styles.coefBtnSm, pressed && styles.coefBtnPressed]}
              >
                <Text style={styles.coefBtnTextSm}>−</Text>
              </Pressable>
              <TextInput
                value={ins.sx}
                onChangeText={(txt) => onZoneAxisCoefChangeText(zk, 'x', txt)}
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={styles.coefInputXs}
                placeholder="1"
                placeholderTextColor={colors.muted}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('hallMap.axisCoefIncrease')}
                hitSlop={4}
                onPress={() => bumpZoneAxis(zk, 'x', 1)}
                style={({ pressed }) => [styles.coefBtnSm, pressed && styles.coefBtnPressed]}
              >
                <Text style={styles.coefBtnTextSm}>+</Text>
              </Pressable>
              <Text style={styles.axisMini}>Sy</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={4}
                onPress={() => bumpZoneAxis(zk, 'y', -1)}
                style={({ pressed }) => [styles.coefBtnSm, pressed && styles.coefBtnPressed]}
              >
                <Text style={styles.coefBtnTextSm}>−</Text>
              </Pressable>
              <TextInput
                value={ins.sy}
                onChangeText={(txt) => onZoneAxisCoefChangeText(zk, 'y', txt)}
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={styles.coefInputXs}
                placeholder="1"
                placeholderTextColor={colors.muted}
              />
              <Pressable
                accessibilityRole="button"
                hitSlop={4}
                onPress={() => bumpZoneAxis(zk, 'y', 1)}
                style={({ pressed }) => [styles.coefBtnSm, pressed && styles.coefBtnPressed]}
              >
                <Text style={styles.coefBtnTextSm}>+</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      {allPcsList.length ? (
        <View style={styles.pcBlock}>
          <Text style={styles.pcBlockTitle} numberOfLines={1}>
            {t('hallMap.pcScaleTitle')}
          </Text>
          <ScrollView
            style={styles.pcCoefScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={allPcsList.length > 6}
          >
            {allPcsList.map(({ pcName, zoneLabel }) => (
              <View key={pcName} style={styles.pcCoefRow}>
                <Text style={styles.pcCoefName} numberOfLines={1}>
                  {pcName}
                  {zoneLabel ? ` · ${zoneLabel}` : ''}
                </Text>
                <TextInput
                  value={pcScaleInput[pcName] ?? String(pcScaleAbs[pcName] ?? 1)}
                  onChangeText={(txt) => onPcScaleChangeText(pcName, txt)}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  style={styles.coefInputSm}
                  placeholder="1"
                  placeholderTextColor={colors.muted}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View style={styles.importBlock}>
        <Text style={styles.importLabel}>{t('hallMap.importJsonLabel')}</Text>
        <TextInput
          value={importJsonText}
          onChangeText={setImportJsonText}
          placeholder={t('hallMap.importJsonPlaceholder')}
          placeholderTextColor={colors.muted}
          multiline
          style={styles.importInput}
        />
        <Pressable
          accessibilityRole="button"
          onPress={onApplyImport}
          style={({ pressed }) => [styles.importApplyBtn, pressed && styles.coefBtnPressed]}
        >
          <Text style={styles.importApplyText}>{t('hallMap.importApply')}</Text>
        </Pressable>
      </View>
      <View
        style={[
          styles.viewport,
          layoutEditMode && styles.viewportEdit,
          { height: viewportMaxH },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.mapCoefBar} accessibilityLabel={t('hallMap.axisCoefAll')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('hallMap.axisCoefAllIncrease')}
            hitSlop={8}
            onPress={() => bumpAllZoneAxisCoef(1)}
            style={({ pressed }) => [styles.mapCoefBtn, pressed && styles.mapCoefBtnPressed]}
          >
            <Text style={styles.mapCoefBtnText}>＋</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('hallMap.axisCoefAllDecrease')}
            hitSlop={8}
            onPress={() => bumpAllZoneAxisCoef(-1)}
            style={({ pressed }) => [styles.mapCoefBtn, pressed && styles.mapCoefBtnPressed]}
          >
            <Text style={styles.mapCoefBtnText}>−</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('hallMap.axisCoefAllReset')}
            hitSlop={8}
            onPress={resetAllZoneAxisCoefAndPan}
            style={({ pressed }) => [styles.mapCoefBtn, styles.mapCoefBtnReset, pressed && styles.mapCoefBtnPressed]}
          >
            <Text style={styles.mapCoefBtnResetText}>⊙</Text>
          </Pressable>
        </View>
        <View style={styles.panClip}>
          <View
            style={[
              styles.panLayer,
              { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
            ]}
          >
            <View
              style={[
                styles.canvas,
                {
                  width: canvasW,
                  height: layout.canvasH,
                  marginLeft: layoutOffsetPx?.x ?? 0,
                  marginTop: layoutOffsetPx?.y ?? 0,
                  backgroundColor: colors.card,
                },
              ]}
            >
              {rooms.map((r, idx) => {
                const zoneKey = makeZoneKey(r, idx);
                const zx = getZoneXY(zoneXYCoef, zoneKey);
                const kx = baseKx * zx.x;
                const ky = baseKy * zx.y;
                const ax = coerceLayoutNum(r.area_frame_x);
                const ay = coerceLayoutNum(r.area_frame_y);
                const aw = coerceLayoutNum(r.area_frame_width);
                const zoneNudge = getHallMapZoneNudgePx(r.area_name);
                const zDrag = zoneDragPx[zoneKey] ?? { x: 0, y: 0 };
                const left = ax * layout.scale * kx + zoneNudge.x + zDrag.x;
                const top = ay * layout.scale * ky + zoneNudge.y + zDrag.y;
                const extentH = areaFrameExtentHeight(r);
                const w = aw * layout.scale * kx;
                const h = extentH * layout.scale * ky;
                const border = hexColor(r.color_border, ZONE_BORDER_FALLBACK);
                const syZone = h / Math.max(1, extentH);
                const insetLogical = ZONE_TITLE_INSET_PX / syZone;
                const placements = pcOffsetsInZonePixels(
                  r.pcs_list ?? [],
                  aw,
                  extentH,
                  w,
                  h,
                  insetLogical,
                  ax,
                  ay,
                );

                const zoneTitlePan = PanResponder.create({
                  onStartShouldSetPanResponder: () => layoutEditMode,
                  onMoveShouldSetPanResponder: (_, g) =>
                    layoutEditMode && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
                  onPanResponderTerminationRequest: () => !layoutEditMode,
                  onPanResponderGrant: () => {
                    const cur = zoneDragPxRef.current[zoneKey] ?? { x: 0, y: 0 };
                    zoneDragStart.current[zoneKey] = { ...cur };
                  },
                  onPanResponderMove: (_, g) => {
                    const s = zoneDragStart.current[zoneKey] ?? { x: 0, y: 0 };
                    setZoneDragPx((prev) => ({
                      ...prev,
                      [zoneKey]: { x: s.x + g.dx, y: s.y + g.dy },
                    }));
                  },
                });

                return (
                  <View
                    key={`${r.area_name}-${idx}`}
                    style={[
                      styles.zone,
                      {
                        left,
                        top,
                        width: w,
                        height: h,
                        borderColor: border,
                      },
                    ]}
                  >
                    <View
                      style={[styles.zoneDragHandle, layoutEditMode && styles.zoneDragHandleActive]}
                      {...(layoutEditMode ? zoneTitlePan.panHandlers : {})}
                    >
                      <Text
                        style={[styles.zoneTitleText, { color: hexColor(r.color_text, colors.text) }]}
                        numberOfLines={2}
                      >
                        {r.area_name}
                      </Text>
                    </View>
                    {placements.map(({ pc, left: pl, top: pt, chipW, chipH }) => {
                      const state = pcAvailability?.[pc.pc_name] ?? 'unknown';
                      const bg =
                        state === 'selected'
                          ? colors.pcSelected
                          : state === 'busy'
                            ? colors.pcBusy
                            : state === 'liveBusy'
                              ? colors.pcLiveBusy
                              : state === 'free'
                                ? colors.pcFree
                                : colors.accentDim;
                      const envPn = getHallMapPcNudgePx(pc.pc_name);
                      const pDrag = pcDragPx[pc.pc_name] ?? { x: 0, y: 0 };
                      const pSc = pcScaleAbs[pc.pc_name] ?? 1;
                      const chipVisualH = Math.max(chipH * pSc, 28);
                      const chipStyle = [
                        styles.pcChip,
                        {
                          left: pl + envPn.x + pDrag.x,
                          top: pt + envPn.y + pDrag.y,
                          width: Math.max(chipW * pSc, 36),
                          minHeight: chipVisualH,
                          backgroundColor: bg,
                        },
                      ];

                      const pcPan = PanResponder.create({
                        onStartShouldSetPanResponder: () => layoutEditMode,
                        onMoveShouldSetPanResponder: (_, g) =>
                          layoutEditMode && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
                        onPanResponderTerminationRequest: () => !layoutEditMode,
                        onPanResponderGrant: () => {
                          const cur = pcDragPxRef.current[pc.pc_name] ?? { x: 0, y: 0 };
                          pcDragStart.current[pc.pc_name] = { ...cur };
                        },
                        onPanResponderMove: (_, g) => {
                          const s = pcDragStart.current[pc.pc_name] ?? { x: 0, y: 0 };
                          setPcDragPx((prev) => ({
                            ...prev,
                            [pc.pc_name]: { x: s.x + g.dx, y: s.y + g.dy },
                          }));
                        },
                      });

                      const label = (
                        <Text style={styles.pcName} numberOfLines={1}>
                          {pc.pc_name}
                        </Text>
                      );

                      if (layoutEditMode) {
                        return (
                          <View
                            key={pc.pc_name}
                            style={[chipStyle, styles.pcChipEdit]}
                            {...pcPan.panHandlers}
                          >
                            {label}
                          </View>
                        );
                      }
                      if (onPcPress) {
                        return (
                          <Pressable
                            key={pc.pc_name}
                            onPress={() => onPcPress(pc.pc_name)}
                            style={chipStyle}
                          >
                            {label}
                          </Pressable>
                        );
                      }
                      return (
                        <View key={pc.pc_name} style={chipStyle}>
                          {label}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    measureOuter: { width: '100%', alignSelf: 'stretch', overflow: 'hidden', zIndex: 0 },
    coefHeader: {
      marginBottom: 6,
      paddingHorizontal: 2,
      gap: 6,
    },
    coefTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
    coefRowAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    coefAllLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginRight: 4 },
    editModeBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    editModeBtnOn: {
      borderColor: colors.accent,
      backgroundColor: colors.zoneBg,
    },
    editModeBtnText: { fontSize: 12, fontWeight: '700', color: colors.muted },
    editModeBtnTextOn: { color: colors.accent },
    editHint: { fontSize: 11, color: colors.muted, marginBottom: 6, lineHeight: 15 },
    axisMini: { fontSize: 10, fontWeight: '700', color: colors.muted, width: 18 },
    zoneCoefScroll: { maxHeight: 200, marginBottom: 8 },
    zoneCoefRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    zoneCoefName: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text, minWidth: 0 },
    coefBtnSm: {
      minWidth: 34,
      height: 32,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coefBtnTextSm: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 20 },
    coefInputSm: {
      minWidth: 56,
      maxWidth: 72,
      height: 32,
      paddingHorizontal: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    coefInputXs: {
      width: 44,
      height: 32,
      paddingHorizontal: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    pcBlock: { marginBottom: 8 },
    pcBlockTitle: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 4 },
    pcCoefScroll: { maxHeight: 140 },
    pcCoefRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pcCoefName: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.text, minWidth: 0 },
    importBlock: { marginBottom: 10, gap: 6 },
    importLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
    importInput: {
      minHeight: 56,
      maxHeight: 120,
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      color: colors.text,
      fontSize: 11,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    importApplyBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.accentDim,
    },
    importApplyText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    coefBtn: {
      minWidth: 40,
      height: 36,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coefBtnPressed: { opacity: 0.85 },
    coefBtnText: { color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 22 },
    viewport: {
      width: '100%',
      overflow: 'hidden',
      borderRadius: 14,
      backgroundColor: colors.bg,
      zIndex: 0,
    },
    viewportEdit: {
      borderWidth: 2,
      borderColor: 'rgba(212, 175, 55, 0.55)',
    },
    panClip: {
      flex: 1,
      overflow: 'hidden',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    panLayer: {
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
    mapCoefBar: {
      position: 'absolute',
      right: 8,
      top: 8,
      zIndex: 20,
      flexDirection: 'column',
    },
    mapCoefBtn: {
      width: 36,
      height: 36,
      marginBottom: 6,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
        android: { elevation: 3 },
      }),
    },
    mapCoefBtnPressed: { opacity: 0.85 },
    mapCoefBtnText: { color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 22 },
    mapCoefBtnReset: { backgroundColor: colors.zoneBg },
    mapCoefBtnResetText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
    canvas: {
      position: 'relative',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    zone: {
      position: 'absolute',
      borderWidth: 2,
      borderRadius: 10,
      backgroundColor: 'rgba(108, 92, 231, 0.09)',
      overflow: 'hidden',
    },
    zoneDragHandle: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      zIndex: 3,
      paddingTop: 4,
      paddingHorizontal: 4,
      minHeight: ZONE_TITLE_INSET_PX + 6,
    },
    zoneDragHandleActive: {
      backgroundColor: 'rgba(212, 175, 55, 0.1)',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(212, 175, 55, 0.4)',
    },
    zoneTitleText: {
      fontSize: 11,
      fontWeight: '700',
      opacity: 0.95,
      textAlign: 'center',
    },
    pcChip: {
      position: 'absolute',
      paddingHorizontal: 5,
      paddingVertical: 4,
      borderRadius: 7,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pcChipEdit: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    pcName: { color: '#fff', fontSize: 11, fontWeight: '700' },
  });
}
