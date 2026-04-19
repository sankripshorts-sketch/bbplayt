import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text } from '../../components/DinText';
import type { StructRoom } from '../../api/types';
import {
  applyPcHallTweaks,
  computeCanonicalZoneFrames,
  computeZonePixelFrame,
  getCanonicalColumnLayout,
  getHallMapTweak,
  getResponsiveCanonicalSpacing,
} from '../../config/clubLayoutConfig';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { normalizePcZoneKind } from '../booking/pcZoneKind';
import { structPcMatchesNearestZoneFilter, type NearestZoneFilter } from '../booking/nearestZoneFilter';
import {
  estimatePcChipScaleUniform,
  formatPcLabelForHallMap,
  globalScaleForRooms,
  pcOffsetsInZonePixels,
  scaledPcChipLayoutUnits,
  type PcAvailabilityState,
} from './clubLayoutGeometry';
import { HallMapStatusLegend } from './HallMapStatusLegend';
import { HALL_PREVIEW } from './hallMapPreviewTokens';
import { formatPublicZoneLabel } from '../../utils/publicText';

function hexColor(raw: string | undefined, fallback: string): string {
  if (!raw?.trim()) return fallback;
  const s = raw.trim();
  return s.startsWith('#') ? s : `#${s}`;
}

const ZONE_BORDER_FALLBACK = '#d4af37';

const ZONE_TITLE_INSET_PX = 22;

const PAN_RESET_MS = 280;

function previewChipColors(state: PcAvailabilityState): { bg: string; text: string } {
  switch (state) {
    case 'selected':
      return { bg: HALL_PREVIEW.selected.fill, text: '#ffffff' };
    case 'busy':
    case 'liveBusy':
      return { bg: HALL_PREVIEW.busy.fill, text: '#ffffff' };
    case 'free':
      return { bg: 'transparent', text: HALL_PREVIEW.chipIdleText };
    case 'unknown':
    default:
      return { bg: HALL_PREVIEW.unavail.fill, text: '#0f172a' };
  }
}

function zoneBorderPreview(areaName: string): string | null {
  const k = normalizePcZoneKind(areaName);
  if (k === 'BootCamp') return HALL_PREVIEW.zoneBoot;
  if (k === 'GameZone') return HALL_PREVIEW.zoneGame;
  if (k === 'VIP') return HALL_PREVIEW.zoneVip;
  return null;
}

export type ClubLayoutCanvasProps = {
  rooms: StructRoom[];
  colors: ColorPalette;
  /** Подбор калибровки схемы из `clubLayoutConfig` (зона/ПК). */
  icafeId?: number;
  /** Показывать на схеме только ПК выбранного тарифа (VIP / BootCamp / GameZone); без пропа — все. */
  zoneFilter?: NearestZoneFilter;
  pcAvailability?: Record<string, PcAvailabilityState>;
  onPcPress?: (pcName: string) => void;
  horizontalPadding?: number;
  minHeight?: number;
  /**
   * Полный вид как в `preview/hall-zones-colors.html`: белая рамка, подписи зон строкой сверху,
   * легенда статусов снизу. Для экрана брони не включать — там своя легенда.
   */
  embedPreviewChrome?: boolean;
  /**
   * Подписи BootCamp / GameZone / VIP строкой над зонами (как в HTML). По умолчанию true при канонической схеме.
   */
  zoneTitlesAbove?: boolean;
  /**
   * Экран брони: ниже соотношение сторон канваса, ниже окно просмотра и меньше отступы подписей зон —
   * чтобы схема занимала меньше места по вертикали.
   */
  bookingCompact?: boolean;
  /** Внешний контрол сброса панорамы вместо встроенной кнопки сброса вида. */
  showResetControl?: boolean;
  /** Токен внешнего сброса панорамы; при изменении возвращаем карту в исходное положение. */
  resetNonce?: number;
};

export function ClubLayoutCanvas({
  rooms,
  colors,
  icafeId,
  zoneFilter,
  pcAvailability,
  onPcPress,
  horizontalPadding = 32,
  minHeight = 300,
  embedPreviewChrome = false,
  zoneTitlesAbove,
  bookingCompact = false,
  showResetControl = true,
  resetNonce,
}: ClubLayoutCanvasProps) {
  const { t } = useLocale();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const [measuredW, setMeasuredW] = useState<number | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panXY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panOrigin = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const onMeasure = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Number.isFinite(w)) setMeasuredW(w);
  }, []);

  const rawCanvasW =
    measuredW != null && measuredW > 0 ? measuredW : Math.max(160, windowW - horizontalPadding);

  const hallTweak = useMemo(() => getHallMapTweak(icafeId), [icafeId]);

  /** На брони — уже центральная колонка (ниже квадрат GameZone), без смены данных API. */
  const hallTweakForLayout = useMemo(() => {
    if (!bookingCompact || !hallTweak.canonicalColumns?.enabled) return hallTweak;
    const c = hallTweak.canonicalColumns;
    return {
      ...hallTweak,
      canonicalColumns: {
        ...c,
        // На брони не сужаем центр: иначе квадрат GameZone становится заметно меньше внутри той же схемы.
        sideWidthFraction: Math.max(0.2, (c.sideWidthFraction ?? 0.2) - 0.02),
      },
    };
  }, [hallTweak, bookingCompact]);

  const schemePreview = hallTweak.canonicalColumns?.enabled === true;
  const schemeEmbed = embedPreviewChrome && schemePreview;
  const shellPad = useMemo(() => {
    const c = hallTweakForLayout.canonicalColumns;
    if (!c?.enabled) return Math.max(0, c?.paddingPx ?? 10);
    return getResponsiveCanonicalSpacing(rawCanvasW, c, { bookingCompact }).pad;
  }, [hallTweakForLayout.canonicalColumns, rawCanvasW, bookingCompact]);

  const layoutCanvasW = useMemo(() => {
    if (!schemeEmbed) return rawCanvasW;
    return Math.max(100, rawCanvasW - 2 * shellPad);
  }, [rawCanvasW, schemeEmbed, shellPad]);

  const columnLayout = useMemo(
    () => getCanonicalColumnLayout(layoutCanvasW, hallTweakForLayout.canonicalColumns, { bookingCompact }),
    [layoutCanvasW, hallTweakForLayout.canonicalColumns, bookingCompact],
  );

  const showZoneTitlesRow = (zoneTitlesAbove !== false) && schemePreview && columnLayout != null;

  /** Высота канваса привязана к ширине (без «лишней» высоты при узком экране). */
  const effectiveMinHeight = useMemo(() => {
    if (!schemePreview) return minHeight;
    const aspect = bookingCompact ? 0.56 : 0.64;
    const minCanonical = bookingCompact ? 180 : 180;
    const hFromWidth = Math.floor(layoutCanvasW * aspect);
    return Math.max(minHeight, hFromWidth, minCanonical);
  }, [schemePreview, minHeight, layoutCanvasW, bookingCompact]);

  const logicalChipUnits = useMemo(() => scaledPcChipLayoutUnits(layoutCanvasW), [layoutCanvasW]);

  const zoneTitleFontSize = bookingCompact
    ? Math.max(10, Math.min(14, layoutCanvasW * 0.028))
    : Math.max(12, Math.min(18, layoutCanvasW * 0.038));
  const zoneTitlesGapBottom = bookingCompact
    ? Math.max(4, Math.min(8, Math.floor(layoutCanvasW * 0.014)))
    : Math.max(6, Math.min(14, Math.floor(layoutCanvasW * 0.022)));

  const layout = useMemo(() => {
    const canonical = computeCanonicalZoneFrames(rooms, layoutCanvasW, effectiveMinHeight, hallTweakForLayout, {
      bookingCompact,
    });
    if (canonical) {
      return { canvasH: canonical.canvasH, scale: 1, zoneFrames: canonical.frames };
    }
    const s = globalScaleForRooms(rooms, layoutCanvasW);
    let maxBottomPx = 0;
    const zoneFrames = rooms.map((r) => computeZonePixelFrame(r, s, hallTweak));
    for (let i = 0; i < zoneFrames.length; i++) {
      const z = zoneFrames[i]!;
      maxBottomPx = Math.max(maxBottomPx, z.top + z.h);
    }
    const h = rooms.length ? Math.max(minHeight, maxBottomPx) : minHeight;
    return { canvasH: h, scale: s, zoneFrames };
  }, [rooms, layoutCanvasW, effectiveMinHeight, hallTweakForLayout, bookingCompact]);

  /** Один масштаб чипов на все зоны в каноне — иначе в узкой и широкой колонке разный размер. */
  const previewUniformChipScale = useMemo(() => {
    if (!schemePreview || !rooms.length) return undefined;
    let g = Infinity;
    const hideInnerZoneTitles = schemeEmbed || showZoneTitlesRow;
    for (let idx = 0; idx < rooms.length; idx++) {
      const r = rooms[idx]!;
      const zf = layout.zoneFrames[idx]!;
      const { w, h, extentH, aw, ax, ay } = zf;
      const titleInsetPx = hideInnerZoneTitles ? 4 : schemePreview ? 12 : ZONE_TITLE_INSET_PX;
      const syZone = h / Math.max(1, extentH);
      const insetLogical = titleInsetPx / syZone;
      const pcs = r.pcs_list ?? [];
      if (!pcs.length) continue;
      const minChipPx = Math.min(36, Math.max(14, Math.floor(Math.min(w, h) * 0.1)));
      const s = estimatePcChipScaleUniform(pcs, aw, extentH, w, h, insetLogical, ax, ay, {
        logicalChipUnits,
        minChipPx,
      });
      if (s > 0) g = Math.min(g, s);
    }
    return Number.isFinite(g) && g < Infinity ? g : undefined;
  }, [schemePreview, rooms, layout.zoneFrames, schemeEmbed, showZoneTitlesRow, logicalChipUnits]);

  const zoneRenderIndices = useMemo(() => {
    if (!rooms.length) return [];
    const items = rooms.map((r, idx) => {
      const z = layout.zoneFrames[idx]!;
      return { idx, area: Math.max(1, z.w * z.h) };
    });
    return items.sort((a, b) => b.area - a.area).map((it) => it.idx);
  }, [rooms, layout.zoneFrames]);

  const viewportFloorPx = bookingCompact ? 220 : 220;
  const contentNeedH = Math.max(viewportFloorPx, layout.canvasH);

  /**
   * Каноническая схема (BootCamp / GameZone / VIP): высота окна = высота схемы.
   * Раньше брали `Math.min(screenCapH, …)` — при `canvasH > screenCapH` низ обрезался под `overflow: hidden`,
   * хотя родительский `ScrollView` мог бы показать карту целиком по вертикали.
   */
  const viewportMaxH = schemePreview
    ? contentNeedH
    : Math.min(
        bookingCompact
          ? Math.min(440, Math.max(220, Math.floor(windowH * 0.5)))
          : Math.min(640, Math.max(220, Math.floor(windowH * 0.58))),
        contentNeedH,
      );
  /** Только если окно выше схемы — центрируем (редко при minHeight с API). */
  const centerCanvasVerticallyInViewport = layout.canvasH < viewportMaxH - 0.5;
  const panRef = useRef(pan);
  panRef.current = pan;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
        onPanResponderTerminationRequest: () => true,
        onPanResponderGrant: () => {
          panXY.stopAnimation((value) => {
            const px = value.x;
            const py = value.y;
            panOrigin.current = { x: 0, y: 0, px, py };
            setPan({ x: px, y: py });
          });
        },
        onPanResponderMove: (_, g) => {
          const nx = panOrigin.current.px + g.dx;
          const ny = panOrigin.current.py + g.dy;
          panXY.setValue({ x: nx, y: ny });
          setPan({ x: nx, y: ny });
        },
      }),
    [panXY],
  );

  const animateResetPan = useCallback(() => {
    panXY.stopAnimation(() => {});
    Animated.parallel([
      Animated.timing(panXY.x, {
        toValue: 0,
        duration: PAN_RESET_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(panXY.y, {
        toValue: 0,
        duration: PAN_RESET_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        panXY.setValue({ x: 0, y: 0 });
        setPan({ x: 0, y: 0 });
      }
    });
  }, [panXY]);

  const panIsOrigin = pan.x === 0 && pan.y === 0;

  useEffect(() => {
    if (resetNonce == null) return;
    animateResetPan();
  }, [resetNonce, animateResetPan]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderViewport = () => (
    <View style={[styles.viewport, { height: viewportMaxH }]} {...panResponder.panHandlers}>
        <View style={[styles.panClip, centerCanvasVerticallyInViewport && styles.panClipCentered]}>
          <Animated.View style={[styles.panLayer, { transform: panXY.getTranslateTransform() }]}>
            <View
              style={[
                styles.canvas,
                {
                  width: layoutCanvasW,
                  height: layout.canvasH,
                  backgroundColor: colors.card,
                  borderWidth: schemeEmbed ? 0 : 1,
                  borderColor: schemeEmbed ? 'transparent' : colors.border,
                },
              ]}
            >
              {zoneRenderIndices.map((idx) => {
                const r = rooms[idx]!;
                const zf = layout.zoneFrames[idx]!;
                const { left, top, w, h, extentH, aw, ax, ay } = zf;
                const previewBorder = zoneBorderPreview(r.area_name ?? '');
                const border =
                  schemePreview && previewBorder
                    ? previewBorder
                    : normalizePcZoneKind(r.area_name) === 'GameZone'
                      ? ZONE_BORDER_FALLBACK
                      : hexColor(r.color_border, ZONE_BORDER_FALLBACK);
                const syZone = h / Math.max(1, extentH);
                const hideInnerZoneTitles = schemeEmbed || showZoneTitlesRow;
                /** Строка названий над зонами — внутри рамки только отступ под чипы. */
                const titleInsetPx = hideInnerZoneTitles
                  ? 4
                  : schemePreview
                    ? 12
                    : ZONE_TITLE_INSET_PX;
                const insetLogical = titleInsetPx / syZone;
                const placements = pcOffsetsInZonePixels(
                  r.pcs_list ?? [],
                  aw,
                  extentH,
                  w,
                  h,
                  insetLogical,
                  ax,
                  ay,
                  {
                    logicalChipUnits,
                    ...(schemePreview
                      ? previewUniformChipScale != null
                        ? { uniformScale: previewUniformChipScale }
                        : {
                            minChipPx: Math.min(36, Math.max(14, Math.floor(Math.min(w, h) * 0.1))),
                          }
                      : {}),
                  },
                );

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
                        backgroundColor: schemePreview ? 'transparent' : 'rgba(108, 92, 231, 0.09)',
                      },
                    ]}
                  >
                    {!hideInnerZoneTitles && (
                      <View style={[styles.zoneDragHandle, { pointerEvents: 'box-none' }]}>
                        <Text
                          style={[
                            styles.zoneTitleText,
                            {
                              color:
                                schemePreview && previewBorder
                                  ? previewBorder
                                  : hexColor(r.color_text, colors.text),
                            },
                          ]}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.72}
                        >
                          {formatPublicZoneLabel(r.area_name, t)}
                        </Text>
                      </View>
                    )}
                    {placements.map(({ pc, left: pl, top: pt, chipW, chipH }) => {
                      const matchesTariff =
                        !zoneFilter ||
                        zoneFilter.mode === 'any' ||
                        structPcMatchesNearestZoneFilter(pc, r.area_name ?? '', zoneFilter);
                      const dimmedByTariff =
                        zoneFilter != null && zoneFilter.mode === 'kinds' && !matchesTariff;
                      const adj = applyPcHallTweaks(pc.pc_name, pl, pt, chipW, chipH, hallTweak);
                      const state = pcAvailability?.[pc.pc_name] ?? (schemePreview ? 'free' : 'unknown');
                      const preview = schemePreview ? previewChipColors(state) : null;
                      const bg = schemePreview
                        ? preview!.bg
                        : state === 'selected'
                          ? colors.pcSelected
                          : state === 'busy'
                            ? colors.pcBusy
                            : state === 'liveBusy'
                              ? colors.pcLiveBusy
                              : state === 'free'
                                ? colors.pcFree
                                : colors.accentDim;
                      const cw = Math.max(2, adj.chipW);
                      const ch = Math.max(2, adj.chipH);
                      const chipBorderW = 2;
                      const chipOuterRadius = 7;
                      const chipInnerRadius = Math.max(0, chipOuterRadius - chipBorderW);
                      /** Ширина текста — внутри контентной области (рамка уже вычтена из координат). */
                      const labelInnerW = Math.max(1, cw - 2 * chipBorderW);
                      const nameFontSize = Math.max(
                        8,
                        Math.min(schemePreview ? 14 : 12, cw * (schemePreview ? 0.42 : 0.28)),
                      );
                      const displayName = formatPcLabelForHallMap(pc.pc_name);
                      const textColor = schemePreview ? preview!.text : '#ffffff';
                      const chipOuterStyle = [
                        styles.pcChip,
                        {
                          left: adj.left,
                          top: adj.top,
                          width: cw,
                          height: ch,
                          minHeight: ch,
                          borderWidth: chipBorderW,
                          borderColor: schemePreview ? HALL_PREVIEW.chipIdleBorder : colors.borderLight,
                          borderRadius: chipOuterRadius,
                          ...(dimmedByTariff ? { opacity: 0.4 } : {}),
                        },
                      ];

                      const chipInnerStyle = [
                        styles.pcChipFill,
                        StyleSheet.absoluteFillObject,
                        {
                          borderRadius: chipInnerRadius,
                          backgroundColor: bg,
                        },
                      ];

                      const label = (
                        <View style={[styles.pcChipLabelCenter, { pointerEvents: 'none' }]}>
                          <Text
                            style={[
                              styles.pcName,
                              {
                                maxWidth: labelInnerW,
                                fontSize: nameFontSize,
                                color: textColor,
                                textAlign: 'center',
                                ...(Platform.OS === 'web'
                                  ? {}
                                  : {
                                      lineHeight: nameFontSize,
                                      ...(Platform.OS === 'android'
                                        ? {
                                            includeFontPadding: false,
                                            textAlignVertical: 'center',
                                          }
                                        : {}),
                                    }),
                              },
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={schemePreview ? 0.45 : 0.55}
                          >
                            {displayName}
                          </Text>
                        </View>
                      );

                      const chipBody = (
                        <View style={chipInnerStyle}>
                          {label}
                        </View>
                      );

                      if (onPcPress) {
                        return (
                          <Pressable key={pc.pc_name} onPress={() => onPcPress(pc.pc_name)} style={chipOuterStyle}>
                            {chipBody}
                          </Pressable>
                        );
                      }
                      return (
                        <View key={pc.pc_name} style={chipOuterStyle}>
                          {chipBody}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </View>
        <View
          style={[
            styles.viewportEdge,
            {
              pointerEvents: 'none',
              borderColor: schemePreview ? HALL_PREVIEW.mapEdge : colors.accent,
              opacity: schemePreview ? 0.92 : 0.55,
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        {showResetControl && !panIsOrigin ? (
          <Pressable
            onPress={animateResetPan}
            style={({ pressed }) => [
              styles.resetPanOverlayBtn,
              bookingCompact && styles.resetPanOverlayBtnCompact,
              pressed && styles.resetPanBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('hallMap.resetView')}
          >
            <MaterialCommunityIcons name="arrow-all" size={22} color={colors.success} />
          </Pressable>
        ) : null}
      </View>
  );

  const innerMap = renderViewport();

  const zoneTitlesRow =
    columnLayout && showZoneTitlesRow ? (
      <View
        style={{
          width: layoutCanvasW,
          maxWidth: '100%',
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: zoneTitlesGapBottom,
        }}
      >
        <View style={{ width: columnLayout.pad }} />
        <View style={{ width: columnLayout.sideW }}>
          <Text
            style={[
              styles.zoneLabelPreview,
              styles.zoneLabelPreviewBoot,
              { color: HALL_PREVIEW.zoneBoot, fontSize: zoneTitleFontSize },
            ]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.45}
          >
            {t('hallMap.zoneBoot')}
          </Text>
        </View>
        <View style={{ width: columnLayout.gap }} />
        <View style={{ width: columnLayout.centerW }}>
          <Text
            style={[styles.zoneLabelPreview, { color: HALL_PREVIEW.zoneGame, fontSize: zoneTitleFontSize }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {t('hallMap.zoneGame')}
          </Text>
        </View>
        <View style={{ width: columnLayout.gap }} />
        <View style={{ width: columnLayout.sideW }}>
          <Text
            style={[styles.zoneLabelPreview, { color: HALL_PREVIEW.zoneVip, fontSize: zoneTitleFontSize }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {t('hallMap.zoneVip')}
          </Text>
        </View>
        <View style={{ width: columnLayout.pad }} />
      </View>
    ) : null;

  return (
    <View style={[styles.measureOuter, bookingCompact && styles.measureOuterBooking]} onLayout={onMeasure}>
      {schemeEmbed && columnLayout ? (
        <View
          style={[
            styles.previewShell,
            {
              padding: shellPad,
              backgroundColor: colors.card,
              borderColor: HALL_PREVIEW.mapEdge,
            },
          ]}
        >
          {zoneTitlesRow}
          {innerMap}
          <HallMapStatusLegend />
        </View>
      ) : showZoneTitlesRow ? (
        <View style={styles.zoneTitlesMapColumn}>
          {zoneTitlesRow}
          {innerMap}
        </View>
      ) : (
        innerMap
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    measureOuter: { width: '100%', alignSelf: 'stretch', overflow: 'hidden', zIndex: 0 },
    /** Не даём подписям зон и рамке вылезти за ширину скролла (обрезка VIP справа). */
    measureOuterBooking: { maxWidth: '100%' },
    zoneTitlesMapColumn: { width: '100%', maxWidth: '100%', alignItems: 'center', overflow: 'hidden' },
    previewShell: {
      width: '100%',
      borderWidth: 2,
      borderRadius: 16,
      alignSelf: 'stretch',
    },
    zoneLabelPreview: {
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.35,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    /** Полное «BootCamp»: без uppercase (не «BOOTCAMP»), иначе на мобилке обрезка. */
    zoneLabelPreviewBoot: {
      letterSpacing: 0,
      textTransform: 'none',
    },
    /** Кнопка сброса панорамы — поверх окна схемы, правый верхний угол. */
    resetPanOverlayBtn: {
      position: 'absolute',
      top: 5,
      right: 5,
      zIndex: 4,
      minWidth: 44,
      minHeight: 44,
      paddingVertical: 0,
      paddingHorizontal: 0,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
    },
    resetPanOverlayBtnCompact: { top: 4, right: 4 },
    resetPanBtnPressed: { opacity: 0.75 },
    viewport: {
      width: '100%',
      overflow: 'hidden',
      borderRadius: 14,
      backgroundColor: colors.bg,
      zIndex: 0,
      position: 'relative',
    },
    /** Видимая граница окна, в котором двигается схема (не перехватывает жесты). */
    viewportEdge: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 14,
      borderWidth: 2,
      opacity: 0.55,
    },
    panClip: {
      flex: 1,
      overflow: 'hidden',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
    },
    panClipCentered: {
      justifyContent: 'center',
    },
    panLayer: {
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
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
    zoneTitleText: {
      fontSize: 10,
      fontWeight: '700',
      opacity: 0.95,
      textAlign: 'center',
    },
    pcChip: {
      position: 'absolute',
      padding: 0,
      overflow: 'hidden',
    },
    /** Заливка на всю контентную область внутри рамки (абсолют позиция — от внутреннего края border). */
    pcChipFill: {
      position: 'absolute',
      overflow: 'hidden',
    },
    /** Flex-центрирование текста — надёжнее, чем одна строка Text на вебе (шрифты/line-height). */
    pcChipLabelCenter: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pcName: { fontWeight: '700', textAlign: 'center' },
  });
}
