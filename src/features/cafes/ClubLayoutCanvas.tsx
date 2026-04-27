import React, { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { getHallPreviewTheme } from './hallMapPreviewTokens';
import { formatPublicZoneLabel } from '../../utils/publicText';

function hexColor(raw: string | undefined, fallback: string): string {
  if (!raw?.trim()) return fallback;
  const s = raw.trim();
  return s.startsWith('#') ? s : `#${s}`;
}

const ZONE_BORDER_FALLBACK = '#d4af37';

const ZONE_TITLE_INSET_PX = 22;

/** Снижение яркости зон/чипов при блокировке (поверх оверлея). */
const SCHEME_CONTENT_DIMMED_OPACITY = 0.2;

function previewChipColors(
  state: PcAvailabilityState,
  hallPreview: ReturnType<typeof getHallPreviewTheme>,
): { bg: string; text: string } {
  switch (state) {
    case 'selected':
      return { bg: hallPreview.selected.fill, text: '#ffffff' };
    case 'busy':
    case 'liveBusy':
      return { bg: hallPreview.busy.fill, text: '#ffffff' };
    case 'free':
      return { bg: 'transparent', text: hallPreview.chipIdleText };
    case 'unknown':
    default:
      return { bg: hallPreview.unavail.fill, text: '#0f172a' };
  }
}

function zoneBorderPreview(
  areaName: string,
  hallPreview: ReturnType<typeof getHallPreviewTheme>,
): string | null {
  const k = normalizePcZoneKind(areaName);
  if (k === 'BootCamp') return hallPreview.zoneBoot;
  if (k === 'GameZone') return hallPreview.zoneGame;
  if (k === 'VIP') return hallPreview.zoneVip;
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
   * Полный вид как в `preview/hall-zones-colors.html`: белая рамка, легенда статусов снизу.
   * Подписи зон — внутри рамок (или `zoneTitlesAbove` для строки над картой). Для экрана брони не включать — там своя легенда.
   */
  embedPreviewChrome?: boolean;
  /**
   * Подписи BootCamp / GameZone / VIP строкой над зонами (как в старом HTML-макете).
   * По умолчанию подписи рисуются внутри рамок зон на канонической схеме.
   */
  zoneTitlesAbove?: boolean;
  /**
   * Экран брони: ниже соотношение сторон канваса, ниже окно просмотра и меньше отступы подписей зон —
   * чтобы схема занимала меньше места по вертикали.
   */
  bookingCompact?: boolean;
  /**
   * Жёсткий потолок высоты окна просмотра схемы (px). На экране брони задаётся из оставшегося места
   * под колонкой flex — иначе каноническая схема раздувает ScrollView по высоте.
   */
  maxViewportHeight?: number;
  /**
   * Затемнение только окна схемы (белая рамка), без строки BootCamp/GameZone/VIP и без лишней области вокруг.
   */
  bookingBlockedOverlay?: { hint: string; onPress: () => void } | null;
  /**
   * Понизить яркость зон и ПК (opacity), например при оверлее «сначала выберите дату».
   * Если задан `bookingBlockedOverlay` — снижение яркости включается автоматически.
   */
  dimContent?: boolean;
};

function ClubLayoutCanvasInner({
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
  maxViewportHeight,
  bookingBlockedOverlay,
  dimContent = false,
}: ClubLayoutCanvasProps) {
  const { t } = useLocale();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const [measuredW, setMeasuredW] = useState<number | null>(null);

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

  const showZoneTitlesRow = zoneTitlesAbove === true && schemePreview && columnLayout != null;

  /** Высота канваса привязана к ширине (без «лишней» высоты при узком экране). */
  const effectiveMinHeight = useMemo(() => {
    if (!schemePreview) return minHeight;
    const aspect = bookingCompact ? 0.5 : 0.64;
    const minCanonical = bookingCompact ? 160 : 180;
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
  /** Отступ сверху зоны под подпись внутри рамки (каноническая схема без строки над картой). */
  const schemeInnerTitleInsetPx = useMemo(() => {
    if (!schemePreview || showZoneTitlesRow) return 12;
    return Math.max(14, Math.floor(zoneTitleFontSize + 10));
  }, [schemePreview, showZoneTitlesRow, zoneTitleFontSize]);

  /** Схема брони: без внешней рамки и заливки — фон как у экрана. */
  const flatBookingScheme = schemePreview && bookingCompact;
  const schemeContentDimmed = dimContent || bookingBlockedOverlay != null;

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
    const hideInnerZoneTitles = showZoneTitlesRow;
    for (let idx = 0; idx < rooms.length; idx++) {
      const r = rooms[idx]!;
      const zf = layout.zoneFrames[idx]!;
      const { w, h, extentH, aw, ax, ay } = zf;
      const titleInsetPx = hideInnerZoneTitles ? 4 : schemeInnerTitleInsetPx;
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
  }, [schemePreview, rooms, layout.zoneFrames, showZoneTitlesRow, schemeInnerTitleInsetPx, logicalChipUnits]);

  const zoneRenderIndices = useMemo(() => {
    if (!rooms.length) return [];
    const items = rooms.map((r, idx) => {
      const z = layout.zoneFrames[idx]!;
      return { idx, area: Math.max(1, z.w * z.h) };
    });
    return items.sort((a, b) => b.area - a.area).map((it) => it.idx);
  }, [rooms, layout.zoneFrames]);

  const viewportFloorPx = bookingCompact ? 200 : 220;
  /** На брони каноническая схема: окно = высоте канваса, без «пола» 200px — иначе под схемой пустота с тем же хитбоксом, что и рамка. */
  const contentNeedH =
    schemePreview && bookingCompact
      ? Math.max(1, layout.canvasH)
      : Math.max(viewportFloorPx, layout.canvasH);

  /**
   * Каноническая схема (BootCamp / GameZone / VIP): высота окна = высота схемы.
   * Раньше брали `Math.min(screenCapH, …)` — при `canvasH > screenCapH` низ обрезался под `overflow: hidden`,
   * хотя родительский `ScrollView` мог бы показать карту целиком по вертикали.
   */
  let viewportMaxH = schemePreview
    ? contentNeedH
    : Math.min(
        bookingCompact
          ? Math.min(440, Math.max(220, Math.floor(windowH * 0.5)))
          : Math.min(640, Math.max(220, Math.floor(windowH * 0.58))),
        contentNeedH,
      );
  if (maxViewportHeight != null && Number.isFinite(maxViewportHeight) && maxViewportHeight > 0) {
    /** Не опускаем потолок ниже высоты самой схемы — иначе низ и рамка режутся (`overflow: hidden`), хотя `ScrollView` может показать блок целиком. */
    const capWithoutClippingCanvas = Math.max(maxViewportHeight, layout.canvasH);
    viewportMaxH = Math.min(viewportMaxH, capWithoutClippingCanvas);
  }
  if (!(schemePreview && bookingCompact)) {
    const floor = bookingCompact ? 72 : 100;
    const cap = maxViewportHeight != null && maxViewportHeight > 0 ? maxViewportHeight : Number.POSITIVE_INFINITY;
    viewportMaxH = Math.max(viewportMaxH, Math.min(floor, cap));
  }
  /** Только если окно выше схемы — центрируем (редко при minHeight с API). На брони не центрируем — лишняя область жестов. */
  const centerCanvasVerticallyInViewport =
    !(schemePreview && bookingCompact) && layout.canvasH < viewportMaxH - 0.5;

  const styles = useMemo(() => createStyles(colors), [colors]);
  const hallPreview = useMemo(() => getHallPreviewTheme(colors), [colors]);

  const renderViewport = () => (
    <View
      style={[
        styles.viewport,
        { height: viewportMaxH },
        flatBookingScheme && { backgroundColor: 'transparent' },
      ]}
    >
        <View style={[styles.panClip, centerCanvasVerticallyInViewport && styles.panClipCentered]}>
          <View style={styles.panLayer}>
            <View
              style={[
                styles.canvas,
                {
                  width: layoutCanvasW,
                  height: layout.canvasH,
                  backgroundColor: schemeEmbed || flatBookingScheme ? 'transparent' : colors.card,
                  borderWidth: schemeEmbed || flatBookingScheme ? 0 : 1,
                  borderColor: schemeEmbed || flatBookingScheme ? 'transparent' : colors.border,
                  ...(schemeContentDimmed && { opacity: SCHEME_CONTENT_DIMMED_OPACITY }),
                },
              ]}
            >
              {zoneRenderIndices.map((idx) => {
                const r = rooms[idx]!;
                const zf = layout.zoneFrames[idx]!;
                const { left, top, w, h, extentH, aw, ax, ay } = zf;
                const previewBorder = zoneBorderPreview(r.area_name ?? '', hallPreview);
                const border =
                  schemePreview && previewBorder
                    ? previewBorder
                    : normalizePcZoneKind(r.area_name) === 'GameZone'
                      ? ZONE_BORDER_FALLBACK
                      : hexColor(r.color_border, ZONE_BORDER_FALLBACK);
                const syZone = h / Math.max(1, extentH);
                const hideInnerZoneTitles = showZoneTitlesRow;
                /** Строка названий над зонами — внутри рамки только отступ под чипы. */
                const titleInsetPx = hideInnerZoneTitles
                  ? 4
                  : schemePreview
                    ? schemeInnerTitleInsetPx
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
                      <View
                        style={[
                          styles.zoneDragHandle,
                          schemePreview && {
                            minHeight: Math.max(28, zoneTitleFontSize + 14),
                            paddingTop: 6,
                          },
                          { pointerEvents: 'box-none' },
                        ]}
                      >
                        <Text
                          style={[
                            schemePreview ? styles.zoneLabelPreview : styles.zoneTitleText,
                            schemePreview && normalizePcZoneKind(r.area_name) === 'BootCamp' && styles.zoneLabelPreviewBoot,
                            schemePreview && normalizePcZoneKind(r.area_name) === 'GameZone' && styles.zoneLabelPreviewGame,
                            {
                              color:
                                schemePreview && previewBorder
                                  ? previewBorder
                                  : hexColor(r.color_text, colors.text),
                              ...(schemePreview ? { fontSize: zoneTitleFontSize } : {}),
                            },
                          ]}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={schemePreview ? 0.45 : 0.72}
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
                      const preview = schemePreview ? previewChipColors(state, hallPreview) : null;
                      const bg = schemePreview
                        ? preview!.bg
                        : state === 'selected'
                          ? colors.pcSelected
                          : state === 'busy'
                            ? colors.pcBusy
                            : state === 'liveBusy'
                              ? colors.pcLiveBusy
                              : state === 'free'
                                ? 'transparent'
                                : colors.pcUnavailable;
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
                      const textColor = schemePreview
                        ? preview!.text
                        : state === 'free'
                          ? colors.text
                          : state === 'unknown'
                            ? '#1c1917'
                            : '#ffffff';
                      const chipOuterStyle = [
                        styles.pcChip,
                        {
                          left: adj.left,
                          top: adj.top,
                          width: cw,
                          height: ch,
                          minHeight: ch,
                          borderWidth: chipBorderW,
                          borderColor: schemePreview
                            ? hallPreview.chipIdleBorder
                            : state === 'free'
                              ? colors.pcFree
                              : colors.borderLight,
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
                          <Pressable
                            key={pc.pc_name}
                            onPress={() => onPcPress(pc.pc_name)}
                            style={chipOuterStyle}
                            hitSlop={6}
                            pressRetentionOffset={10}
                          >
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
          </View>
        </View>
        {!flatBookingScheme && (
          <View
            style={[
              styles.viewportEdge,
              {
                pointerEvents: 'none',
                borderColor: schemePreview ? hallPreview.mapEdge : colors.accent,
                opacity: schemePreview ? 0.92 : 0.55,
              },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        )}
      </View>
  );

  const innerMap = renderViewport();

  const innerMapStack =
    bookingBlockedOverlay != null ? (
      <View style={styles.bookingViewportDimHost}>
        {innerMap}
        <Pressable style={styles.bookingBlockedOverlay} onPress={bookingBlockedOverlay.onPress}>
          <Text style={styles.bookingBlockedOverlayText}>{bookingBlockedOverlay.hint}</Text>
        </Pressable>
      </View>
    ) : (
      innerMap
    );

  const zoneTitlesRow =
    columnLayout && showZoneTitlesRow ? (
      <View
        style={{
          width: '100%',
          maxWidth: layoutCanvasW,
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
              { color: hallPreview.zoneBoot, fontSize: zoneTitleFontSize },
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
            style={[
              styles.zoneLabelPreview,
              styles.zoneLabelPreviewGame,
              { color: hallPreview.zoneGame, fontSize: zoneTitleFontSize },
            ]}
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
            style={[styles.zoneLabelPreview, { color: hallPreview.zoneVip, fontSize: zoneTitleFontSize }]}
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
              borderColor: hallPreview.mapEdge,
            },
          ]}
        >
          {zoneTitlesRow}
          {innerMapStack}
          <HallMapStatusLegend />
        </View>
      ) : showZoneTitlesRow ? (
        <View style={styles.zoneTitlesMapColumn}>
          {zoneTitlesRow}
          {innerMapStack}
        </View>
      ) : (
        innerMapStack
      )}
    </View>
  );
}

function zoneFilterEquals(a: NearestZoneFilter | undefined, b: NearestZoneFilter | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.mode !== b.mode) return false;
  if (a.mode === 'any') return true;
  if (b.mode === 'any') return false;
  if (a.kinds.length !== b.kinds.length) return false;
  for (let i = 0; i < a.kinds.length; i += 1) {
    if (a.kinds[i] !== b.kinds[i]) return false;
  }
  return true;
}

export const ClubLayoutCanvas = React.memo(ClubLayoutCanvasInner, (prev, next) => {
  return (
    prev.rooms === next.rooms &&
    prev.colors === next.colors &&
    prev.icafeId === next.icafeId &&
    zoneFilterEquals(prev.zoneFilter, next.zoneFilter) &&
    prev.pcAvailability === next.pcAvailability &&
    prev.onPcPress === next.onPcPress &&
    prev.horizontalPadding === next.horizontalPadding &&
    prev.minHeight === next.minHeight &&
    prev.embedPreviewChrome === next.embedPreviewChrome &&
    prev.zoneTitlesAbove === next.zoneTitlesAbove &&
    prev.bookingCompact === next.bookingCompact &&
    prev.maxViewportHeight === next.maxViewportHeight &&
    prev.bookingBlockedOverlay === next.bookingBlockedOverlay &&
    prev.dimContent === next.dimContent
  );
});

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    measureOuter: { width: '100%', alignSelf: 'stretch', overflow: 'hidden', zIndex: 0 },
    /** Не даём подписям зон и рамке вылезти за ширину скролла (обрезка VIP справа). */
    measureOuterBooking: { maxWidth: '100%' },
    zoneTitlesMapColumn: { width: '100%', maxWidth: '100%', alignItems: 'center', overflow: 'hidden' },
    /** Как у `viewport` — обрезаем затемнение по скруглению рамки схемы. */
    bookingViewportDimHost: {
      position: 'relative',
      alignSelf: 'stretch',
      width: '100%',
      borderRadius: 16,
      overflow: 'hidden',
    },
    bookingBlockedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.40)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      zIndex: 10,
      borderRadius: 16,
    },
    bookingBlockedOverlayText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 18,
    },
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
    /** «GameZone» в каноническом написании, не ALL CAPS. */
    zoneLabelPreviewGame: {
      letterSpacing: 0,
      textTransform: 'none',
    },
    viewport: {
      width: '100%',
      overflow: 'hidden',
      borderRadius: 14,
      backgroundColor: colors.bg,
      zIndex: 0,
      position: 'relative',
    },
    /** Видимая граница окна схемы (не перехватывает жесты). */
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
      borderWidth: StyleSheet.hairlineWidth,
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
