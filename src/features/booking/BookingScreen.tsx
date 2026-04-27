import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  type ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text } from '../../components/DinText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { type BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchCafeBookingProducts, mergeBookingProductsCatalog } from '../../api/cafeBookingProducts';
import { bookingFlowApi, cafesApi } from '../../api/endpoints';
import { fetchMemberPcSessionInfo, type MemberPcSessionInfo } from '../../api/memberPcStatusApi';
import { ApiError } from '../../api/client';
import type { CafeItem, MemberBookingRow, PcListItem, PriceItem, ProductItem } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { buildTopUpUrlWithSession, getTopUpUrl } from '../../config/topUpUrl';
import { useLocale, type AppLocale } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/messagesRu';
import {
  addCalendarDaysMoscow,
  formatISODateMoscow,
  formatInstantMoscowWallForLocale,
  formatMoscowCalendarDayLong,
  formatMoscowCalendarDayShort,
} from '../../datetime/mskTime';
import { nowForBookingCompareMs } from '../../datetime/serverBookingClock';

/** Горизонтальный отступ контента экрана брони; сумма — оценка ширины схемы до `onLayout` в `ClubLayoutCanvas`. */
const BOOKING_SCROLL_H_PAD = 24;
/** Фиксированная высота ряда «компания» и др. не-плашечных контролов. */
const FILTER_WHEEL_ROW_HEIGHT = 60;
/** Плашки фильтров (клуб / дата / время) — чуть компактнее ряда компании. */
const FILTER_PLATE_ROW_HEIGHT = 54;
/** Вторая строка под выбранным значением на плашке фильтра. */
const FILTER_PLATE_SUBTITLE_SLOT_HEIGHT = 15;
/** В приложении бронирование идёт по 10-минутной сетке, даже если vibe отдаёт грубый шаг в прайсе. */
const BOOKING_TIME_STEP_MINS = 10;

/** В колесе «по времени» только 30 / 60 / 90 / 120 мин (ставки из `prices` на сервере). */
const HOURLY_DURATION_PRESETS_BASE = HOURLY_GRID_DURATION_MINUTES;

/**
 * `indexOf(dateStart)` часто даёт -1 (формат, сдвиг окна списка) → раньше подставлялся idx 0 («сегодня»).
 * Без этого после повторного открытия колеса дата визуально сбрасывалась.
 */
function wheelIndexForCalendarIso(dateISO: string, list: readonly string[]): number {
  if (!list.length) return 0;
  const key = dateISO.trim().slice(0, 10);
  let idx = list.indexOf(dateISO);
  if (idx >= 0) return idx;
  idx = list.indexOf(key);
  if (idx >= 0) return idx;
  for (let i = 0; i < list.length; i++) {
    if (list[i] >= key) return i;
  }
  return list.length - 1;
}

function nearestCandidateKey(c: NearestWindowCandidate): string {
  return `${c.cafe.icafe_id}:${c.windowStart.getTime()}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeComparable(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

/** В колесе клубов не дублируем выбранный город в начале адреса. */
function stripCityPrefixFromAddress(address: string, cityNames: readonly string[]): string {
  const raw = String(address ?? '').trim();
  if (!raw) return raw;
  const cityComparables = cityNames
    .map((name) => normalizeComparable(name))
    .filter((name): name is string => Boolean(name));

  const byComma = raw.split(',');
  if (byComma.length > 1) {
    const firstChunk = normalizeComparable(byComma[0] ?? '');
    if (cityComparables.includes(firstChunk)) {
      const trimmed = byComma.slice(1).join(',').trim();
      if (trimmed) return trimmed;
    }
  }

  for (const name of cityNames) {
    const cityName = String(name ?? '').trim();
    if (!cityName) continue;
    const escaped = escapeRegex(cityName);
    const patterns = [
      new RegExp(`^${escaped}\\s*[,.-]\\s*`, 'i'),
      new RegExp(`^г\\.?\\s*${escaped}\\s*[,.-]\\s*`, 'i'),
      new RegExp(`^${escaped}\\s+г\\.?\\s*[,.-]?\\s*`, 'i'),
      new RegExp(`^city\\s+of\\s+${escaped}\\s*[,.-]\\s*`, 'i'),
    ];
    for (const rx of patterns) {
      const stripped = raw.replace(rx, '').trim();
      if (stripped && stripped !== raw) return stripped;
    }
  }
  return raw;
}

import type { ColorPalette, ThemeName } from '../../theme/palettes';
import { useTheme } from '../../theme';
import { bookingSignReady, getBookingKeyMode } from '../../config/bookingSignConfig';
import { getContestSignSecret } from '../../config/contestSignSecret';
import { getHallMapTweak } from '../../config/clubLayoutConfig';
import { ClubLayoutCanvas } from '../cafes/ClubLayoutCanvas';
import { HallMapStatusLegend } from '../cafes/HallMapStatusLegend';
import type { PcAvailabilityState } from '../cafes/clubLayoutGeometry';
import { addBookingEventToCalendar, getCalendarPermissionsAsyncSafe } from '../../calendar/deviceCalendar';
import {
  cancelBookingScheduledReminders,
  cancelScheduledRemindersForCancelledBooking,
  scheduleBookingRemindersFromPrefs,
} from '../../notifications/bookingReminders';
import {
  cafesInCity,
  DEFAULT_CITY_ID,
  getCityDefinition,
  inferCityIdFromCafe,
  orderedCitiesForPicker,
} from '../../config/citiesCatalog';
import { loadAppPreferences, patchAppPreferences } from '../../preferences/appPreferences';
import { queryKeys } from '../../query/queryKeys';
import { ClubDataLoader } from '../ui/ClubDataLoader';
import { TabScreenTopBar } from '../../components/TabScreenTopBar';
import { useAppAlert } from '../../components/AppAlertContext';
import type { BookingPrefillParams, MainTabParamList } from '../../navigation/types';
import { TodaysBookingBanner } from './TodaysBookingBanner';
import { DimmedSheetModal } from '../../components/DimmedSheetModal';
import { DraggableScreenSheet, DraggableWheelSheet } from './DraggableWheelSheet';
import {
  WheelPickerColumn,
  WHEEL_VIEWPORT_HEIGHT,
  type WheelPickerColumnHandle,
  type WheelPickerItem,
} from './WheelPickerColumn';
import { useLivePcsQuery } from './useLivePcsQuery';
import { useMemberBooksQuery } from './useMemberBooksQuery';
import { useCafeBookingsQuery } from './useCafeBookingsQuery';
import {
  bookingRowLifecycleStatus,
  busyUntilInstantForPcListItem,
  canCancelMemberBookingRow,
  canShowRepeatMemberBookingRow,
  cafeLabel,
  countTotalMemberBookingsInData,
  findOverlappingBookingForPc,
  findOverlappingOutstandingBooking,
  formatIntervalClock,
  hasAnyMemberBookingRows,
  isMemberBookingRowInPast,
  memberBookingRowStableKey,
  mergeBookingRowsForCafeOverlap,
  memberOfferIdForApi,
  pcLowerNamesWithBookingOverlappingPlan,
  sortMemberBookingRows,
} from './memberBookingsUtils';
import { useCancelBookingMutation } from './useCancelBookingMutation';
import { useBookingNowMs } from './useBookingNowMs';
import {
  formatMemberBookingIntervalLine,
  intervalFromMemberRow,
  intervalsOverlap,
  intervalTouchesCalendarDay,
  moscowSelectionToServerDateTime,
  formatMoscowWallSlotForLocale,
  effectivePcBusyForPlan,
  pcListItemBlocksPlannedSlot,
  plannedInterval,
  planIntervalFromWindowStart,
} from './bookingTimeUtils';
import {
  buildBookingTimeSlots,
  defaultTimeSlotWheelIndex,
  snapWindowToBookableSlot,
} from './bookingTimeSlots';
import {
  findNearestClubWindows,
  pickPcsForPartyForPlan,
  pickSpecificPcsForPlan,
  type NearestWindowCandidate,
} from './nearestWindowSearch';
import { pcMatchesNearestZoneFilter, type NearestZoneFilter } from './nearestZoneFilter';
import { pcZoneKindFromPc, type PcZoneKind } from './pcZoneKind';
import {
  bookingMinsAfterTariffSelect,
  bookingPackageWheelDisplayMins,
  buildTermsTariffMatrix,
  catalogProductSessionMins,
  dedupeBookingWheelPackagesByDuration,
  filterBookingWheelPackageProducts,
  HOURLY_GRID_DURATION_MINUTES,
  isDistinctBookingPackageWheelDuration,
  matchPriceTierToMinutes,
  isHourlyGridDurationMins,
  shouldChargeViaCatalogProducts,
  parseMinsFromProduct,
  pickHourlyTemplateForSessionMins,
  priceItemsEqual,
  productTierLabel,
  tariffCostLabel,
  tariffFromSaved,
  tariffNameForApi,
  tariffToSaved,
  type TariffChoice,
} from './tariffSelection';
import {
  type BookingTariffApiIds,
  bookingTariffIdsForApi,
  gameZonePerHourPackageSavingPercent,
  hourlyRubPerHourRangeForSession,
  pcZoneLabel,
  packageSavingPercentForWheel,
  priceBookingRubForResolvedTier,
  priceItemsForPcZoneKind,
  wheelZoneProductForSavingLabel,
  productPackagePriceRub,
  resolveTariffForPc,
  totalBookingRub,
} from './zoneTariffResolve';
import { pcNamesLooselyEqual } from './pcNameMatch';
import { formatBookingDurationHuman } from './durationHuman';
import {
  formatPublicClubLabel,
  formatPublicErrorMessage,
  formatPublicPcLabel,
  formatPublicPcList,
  formatPublicZoneLabel,
} from '../../utils/publicText';

function hourlyPresetLineLabel(
  m: number,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  locale: AppLocale,
): string {
  const s = formatBookingDurationHuman(m, locale);
  return s || t('booking.durationMinutes', { n: m });
}

/**
 * Процент «выгоднее» для пресета «N ч / пакет» в колесе длительности:
 * сначала цена из каталога `products` (как у пользователя: пакет 80 ₽ vs 100 ₽/ч),
 * иначе сетка `prices`. Если наоборот — сетка даёт lump 180 мин (напр. 150 ₽) и получается ~50% вместо ~75%.
 */
function packageSavingPercentForPresetPackageMinutes(
  mins: number,
  pricesList: PriceItem[],
  productsCatalog: ProductItem[],
  packageZone: PcZoneKind,
  showSavingBenefit: boolean,
): number | null {
  if (!showSavingBenefit) return null;
  const match = productsCatalog.find((p) => bookingPackageWheelDisplayMins(p, 0) === mins);
  if (match) {
    const fromCatalog = packageSavingPercentForWheel(match, pricesList, productsCatalog, packageZone);
    if (fromCatalog != null) return fromCatalog;
    const ref = wheelZoneProductForSavingLabel(match, productsCatalog, packageZone);
    const rub = productPackagePriceRub({ kind: 'product', item: ref });
    if (Number.isFinite(rub) && rub > 0) {
      const zonePrices = priceItemsForPcZoneKind(pricesList, packageZone);
      const g = zonePrices.length > 0 ? gameZonePerHourPackageSavingPercent(mins, rub, zonePrices) : null;
      if (g != null) return g;
    }
  }
  return null;
}

/** Подпись пресета: только 30–120 мин — почасовка; иначе (не используется в текущем колесе) — пакет. */
function presetDurationWheelLabel(
  mins: number,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  locale: AppLocale,
  pricesList: PriceItem[],
  productsCatalog: ProductItem[],
  packageZone: PcZoneKind,
  showSavingBenefit: boolean,
): WheelPickerItem {
  if (HOURLY_DURATION_PRESETS_BASE.includes(mins)) {
    return hourlyPresetLineLabel(mins, t, locale);
  }
  const dur = formatBookingDurationHuman(mins, locale);
  const line1 = t('booking.packageWheelLine1', { duration: dur });
  if (!pricesList.length && !productsCatalog.length) return line1;
  const pct = packageSavingPercentForPresetPackageMinutes(
    mins,
    pricesList,
    productsCatalog,
    packageZone,
    showSavingBenefit,
  );
  if (pct != null) return { main: line1, sub: t('booking.packageVsHourlyPercent', { n: pct }) };
  return line1;
}

function productWheelLineLabel(
  p: ProductItem,
  locale: AppLocale,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  pricesList: PriceItem[],
  productsCatalog: ProductItem[],
  packageZone: PcZoneKind,
  showSavingBenefit: boolean,
): WheelPickerItem {
  const mins = bookingPackageWheelDisplayMins(p, 0);
  const dur = formatBookingDurationHuman(mins, locale);
  let line1 = dur
    ? t('booking.packageWheelLine1', { duration: dur })
    : t('booking.packageWheelNoDuration', { line: productTierLabel(p) });
  if (!pricesList.length && !productsCatalog.length) return line1;
  const pct = showSavingBenefit ? packageSavingPercentForWheel(p, pricesList, productsCatalog, packageZone) : null;
  if (pct != null) return { main: line1, sub: t('booking.packageVsHourlyPercent', { n: pct }) };
  return line1;
}

const PC_REFETCH_INTERVAL_MS = 60_000;
const ZONE_WHEEL_KEYS = ['any', 'VIP', 'BootCamp', 'GameZone'] as const;
/** Обычный список ПК на экране брони — без поиска «ближайшего окна» (он для поиска по всем клубам). */
const IS_FIND_WINDOW_MAIN = false;

type BookingStyles = ReturnType<typeof createBookingStyles>;
type PcListSection = {
  key: 'GameZone' | 'BootCamp' | 'VIP' | 'Other';
  title: string;
  pairs: PcListItem[][];
};
type PcStatusMeta = {
  selected: boolean;
  busy: boolean;
  statusLine: string;
};
type PcFlatListRow = {
  key: string;
  sectionTitle: string;
  showSectionTitle: boolean;
  pair: PcListItem[];
};

const MemoClubLayoutCanvas = ClubLayoutCanvas;

const BookingPcCard = React.memo(function BookingPcCard({
  item,
  meta,
  canSelectPc,
  styles,
  colors,
  onPress,
  uiPcLabel,
  t,
}: {
  item: PcListItem;
  meta: PcStatusMeta;
  canSelectPc: boolean;
  styles: BookingStyles;
  colors: ColorPalette;
  onPress: (item: PcListItem) => void;
  uiPcLabel: (pcName: string) => string;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}) {
  return (
    <Pressable
      style={[
        styles.pcCard,
        styles.pcCardGridHalf,
        meta.busy && styles.pcCardBusy,
        meta.selected && styles.pcCardSelected,
        !canSelectPc && { pointerEvents: 'none' },
      ]}
      onPress={() => onPress(item)}
      disabled={canSelectPc && meta.busy}
    >
      {!canSelectPc ? <View style={[styles.pcCardDimLock, { pointerEvents: 'none' }]} /> : null}
      <View style={styles.pcCardBodyAboveDim}>
        <Text style={styles.pcName} numberOfLines={1}>
          {uiPcLabel(item.pc_name)}
        </Text>
        <Text style={styles.pcSub} numberOfLines={2}>
          {formatPublicZoneLabel(pcZoneLabel(item) || '', t)} · {meta.statusLine}
        </Text>
      </View>
      {meta.selected ? (
        <View style={styles.pcCardCheckAboveDim}>
          <MaterialCommunityIcons
            name="check-circle"
            size={18}
            color={colors.pcSelected}
          />
        </View>
      ) : null}
    </Pressable>
  );
});

const BookingPcListRow = React.memo(function BookingPcListRow({
  row,
  styles,
  colors,
  canSelectPc,
  pcStatusByPc,
  onPressPc,
  uiPcLabel,
  t,
}: {
  row: PcFlatListRow;
  styles: BookingStyles;
  colors: ColorPalette;
  canSelectPc: boolean;
  pcStatusByPc: Map<string, PcStatusMeta>;
  onPressPc: (item: PcListItem) => void;
  uiPcLabel: (pcName: string) => string;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}) {
  return (
    <View style={styles.pcZoneSection}>
      {row.showSectionTitle ? <Text style={styles.pcZoneSectionTitle}>{row.sectionTitle}</Text> : null}
      <View style={styles.pcListRow}>
        {row.pair.map((item, ii) => {
          const lk = String(item.pc_name).trim().toLowerCase();
          const meta = pcStatusByPc.get(lk) ?? {
            selected: false,
            busy: false,
            statusLine: t('booking.pcStatusFree'),
          };
          return (
            <BookingPcCard
              key={`${item.pc_name}-${row.key}-${ii}`}
              item={item}
              meta={meta}
              canSelectPc={canSelectPc}
              styles={styles}
              colors={colors}
              onPress={onPressPc}
              uiPcLabel={uiPcLabel}
              t={t}
            />
          );
        })}
        {row.pair.length === 1 ? <View style={styles.pcListCellSpacer} /> : null}
      </View>
    </View>
  );
}, (prev, next) => {
  if (prev.row !== next.row) return false;
  if (prev.styles !== next.styles) return false;
  if (prev.colors !== next.colors) return false;
  if (prev.canSelectPc !== next.canSelectPc) return false;
  if (prev.onPressPc !== next.onPressPc) return false;
  if (prev.uiPcLabel !== next.uiPcLabel) return false;
  if (prev.t !== next.t) return false;
  if (prev.pcStatusByPc === next.pcStatusByPc) return true;
  for (const item of prev.row.pair) {
    const lk = String(item.pc_name).trim().toLowerCase();
    const a = prev.pcStatusByPc.get(lk);
    const b = next.pcStatusByPc.get(lk);
    if ((a?.selected ?? false) !== (b?.selected ?? false)) return false;
    if ((a?.busy ?? false) !== (b?.busy ?? false)) return false;
    if ((a?.statusLine ?? '') !== (b?.statusLine ?? '')) return false;
  }
  return true;
});

export function BookingScreen() {
  const { user, refreshMemberBalance } = useAuth();
  const qc = useQueryClient();
  const isFocused = useIsFocused();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Booking'>>();
  const { t, locale } = useLocale();
  const { showAlert } = useAppAlert();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const scrollHPad = useMemo(() => {
    if (windowWidth < 340) return 14;
    if (windowWidth < 400) return 18;
    return 24;
  }, [windowWidth]);
  const compactVertical = windowHeight < 700;
  const styles = useMemo(() => createBookingStyles(colors, theme, scrollHPad), [colors, theme, scrollHPad]);
  const topUpUrl = useMemo(() => buildTopUpUrlWithSession(getTopUpUrl(), user), [user]);

  const [cafe, setCafe] = useState<CafeItem | null>(null);
  const [dateStart, setDateStart] = useState(() =>
    formatISODateMoscow(new Date(nowForBookingCompareMs())),
  );
  const [timeStart, setTimeStart] = useState(() => {
    const day = formatISODateMoscow(new Date(nowForBookingCompareMs()));
    return buildBookingTimeSlots(day)[0] ?? '12:00';
  });
  const [mins, setMins] = useState('60');
  const [priceName, setPriceName] = useState('');
  const [tariff, setTariff] = useState<TariffChoice | null>(null);
  const [selectedPcs, setSelectedPcs] = useState<PcListItem[]>([]);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const tariffScopeInitRef = useRef('');

  const [modalClub, setModalClub] = useState(false);
  const [modalDate, setModalDate] = useState(false);
  const [modalTimeDuration, setModalTimeDuration] = useState(false);
  const [modalTariff, setModalTariff] = useState(false);
  /** Просмотр прайса клуба без выбора тарифа ПК (от ссылки «Условия и цены»). */
  const [modalTermsPrices, setModalTermsPrices] = useState(false);
  /** Подтверждение выбора в шторках (как в превью HTML) */
  const [dateFilterCommitted, setDateFilterCommitted] = useState(false);
  const [timeDurationFilterCommitted, setTimeDurationFilterCommitted] = useState(false);
  /** Подтверждение выбора зоны в шторке «Тариф ПК» в меню поиска ближайшего окна (не «Без разницы»). */
  const [nearestSearchPcZoneCommitted, setNearestSearchPcZoneCommitted] = useState(false);
  const [pendingClubIdx, setPendingClubIdx] = useState(0);
  const [pendingCityIdx, setPendingCityIdx] = useState(0);
  const [pendingDateIdx, setPendingDateIdx] = useState(0);
  const [pendingTimeIdx, setPendingTimeIdx] = useState(0);
  const [pendingDurIdx, setPendingDurIdx] = useState(0);
  const [pendingZoneIdx, setPendingZoneIdx] = useState(0);
  const pendingCityIdxRef = useRef(0);
  const pendingClubIdxRef = useRef(0);
  const pendingDateIdxRef = useRef(0);
  const pendingTimeIdxRef = useRef(0);
  const pendingDurIdxRef = useRef(0);
  const pendingZoneIdxRef = useRef(0);
  const pendingNearestDayIdxRef = useRef(0);
  const clubWheelRef = useRef<WheelPickerColumnHandle>(null);
  const cityWheelRef = useRef<WheelPickerColumnHandle>(null);
  const dateWheelRef = useRef<WheelPickerColumnHandle>(null);
  const timeWheelRef = useRef<WheelPickerColumnHandle>(null);
  const durWheelRef = useRef<WheelPickerColumnHandle>(null);
  const zoneWheelRef = useRef<WheelPickerColumnHandle>(null);
  const nearestDayWheelRef = useRef<WheelPickerColumnHandle>(null);
  /** Отмена сетевых запросов поиска ближайшего окна (закрытие шторки / новый поиск). */
  const nearestSearchAbortRef = useRef<AbortController | null>(null);
  /** Актуальная дата сетки времени (для async в `applyTimeDurationWheelSelection`). */
  const effectiveDateForTimeSlotsRef = useRef<string>(dateStart);
  /** Дата основной формы брони — не путать с датой сетки в меню «ближайшее окно». */
  const mainFormDateForSlotsRef = useRef<string>(dateStart);
  const mainTimeSlotsRef = useRef<string[]>([]);
  const nearestSearchFullDayTimeGridRef = useRef(false);
  const timeModalNearestSearchRef = useRef(false);
  const [modalBooks, setModalBooks] = useState(false);
  const [bookingsCancelConfirm, setBookingsCancelConfirm] = useState<{
    row: MemberBookingRow;
    icafeIdStr: string;
  } | null>(null);
  const [modalNearestMenu, setModalNearestMenu] = useState(false);
  const [nearestMenuPhase, setNearestMenuPhase] = useState<'form' | 'results'>('form');
  const [nearestSlotResults, setNearestSlotResults] = useState<NearestWindowCandidate[]>([]);
  /** Конкретные ПК в меню «ближайшее окно»: искать слоты только на них одновременно. */
  const [nearestSearchTargetPcs, setNearestSearchTargetPcs] = useState<PcListItem[]>([]);
  /** Для поиска «ближайшее окно»: `null` — без ограничения по дню (с текущего момента). */
  const [nearestSearchDayISO, setNearestSearchDayISO] = useState<string | null>(null);
  /** `true` — время для поиска «не важно» (якорь только от «сейчас» / дня); иначе — не раньше выбранного слота. */
  const [nearestSearchTimeAny, setNearestSearchTimeAny] = useState(true);
  /** Для async в шторке длительности: не затирать дату основной формы при «Без разницы» по дню поиска. */
  const nearestSearchDayISORef = useRef<string | null>(null);
  nearestSearchDayISORef.current = nearestSearchDayISO;
  const [modalNearestDay, setModalNearestDay] = useState(false);
  const [pendingNearestDayIdx, setPendingNearestDayIdx] = useState(0);
  /** Шторка «время/длительность» открыта из меню ближайшего окна — в колесе времени есть пункт «Без разницы». */
  const [timeModalForNearestSlotSearch, setTimeModalForNearestSlotSearch] = useState(false);
  /**
   * Во время прокрутки колес/фильтров временно замораживаем «живые» запросы:
   * иначе фоновые refetch'и конкурируют за кадры и дергают анимации.
   */
  const isBookingFilterSheetOpen =
    modalClub || modalDate || modalTimeDuration || modalTariff || modalNearestDay || modalNearestMenu;

  /** Тип ПК только для поиска «ближайшее окно» (не смешивает зоны для компании — см. pickPcsForPartyForPlan). */
  const [nearestSearchPcZone, setNearestSearchPcZone] = useState<'any' | 'VIP' | 'BootCamp' | 'GameZone'>('any');
  const nearestZoneFilter: NearestZoneFilter = useMemo(
    () =>
      nearestSearchPcZone === 'any' ? { mode: 'any' } : { mode: 'kinds', kinds: [nearestSearchPcZone] },
    [nearestSearchPcZone],
  );

  useEffect(() => {
    setNearestSearchTargetPcs([]);
  }, [cafe?.icafe_id]);

  useEffect(() => {
    if (nearestSearchTargetPcs.length === 0) return;
    setNearestSearchTargetPcs((prev) => {
      const filtered = prev.filter((pc) => pcMatchesNearestZoneFilter(pc, nearestZoneFilter));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [nearestSearchTargetPcs, nearestZoneFilter]);
  /** На основном экране брони схема и список показывают все зоны; фильтр по зоне только в поиске ближайшего окна. */
  const bookingMapZoneFilter: NearestZoneFilter = useMemo(() => ({ mode: 'any' }), []);
  /** Отображение схемы зала или списка мест (по умолчанию — схема). */
  const [seatLayoutMode, setSeatLayoutMode] = useState<'scheme' | 'list'>('scheme');
  /** Зона тарифа ПК для пакетов 3 ч / 5 ч в колесе и подписи «выгоднее»: по первому выбранному ПК. */
  const effectivePackageZone = useMemo((): PcZoneKind => {
    if (selectedPcs.length > 0) return pcZoneKindFromPc(selectedPcs[0]!);
    return 'GameZone';
  }, [selectedPcs]);
  const showSavingBenefit = selectedPcs.length > 0;
  const [modalOccupancy, setModalOccupancy] = useState(false);
  /** `null` — ближайшие брони по времени; иначе фильтр по календарному дню YYYY-MM-DD (МСК). */
  const [occupancyFilterDay, setOccupancyFilterDay] = useState<string | null>(null);
  const [pendingPrefill, setPendingPrefill] = useState<BookingPrefillParams | null>(null);
  const [cancellingBookKey, setCancellingBookKey] = useState<string | null>(null);
  /** Только жест «потянуть» — иначе фоновый refetch (отмена, invalidate, интервал) даёт моргание индикатора. */
  const [myBookingsPullRefresh, setMyBookingsPullRefresh] = useState(false);
  const [mainScrollViewportH, setMainScrollViewportH] = useState(0);
  const [mainScrollContentH, setMainScrollContentH] = useState(0);

  const formatDateHuman = (iso: string) => formatMoscowCalendarDayLong(iso, locale === 'en' ? 'en' : 'ru');
  const uiClubLabel = useCallback((address?: string | null) => formatPublicClubLabel({ address, t }), [t]);
  const uiPcLabel = useCallback((pcName: string) => formatPublicPcLabel(pcName, t), [t]);
  const uiPcList = useCallback((pcNames: string[]) => formatPublicPcList(pcNames, t), [t]);

  const cafesQ = useQuery({
    queryKey: queryKeys.cafes(),
    queryFn: () => cafesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const cafeAddressById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cafesQ.data ?? []) {
      m.set(c.icafe_id, c.address);
    }
    return m;
  }, [cafesQ.data]);

  useEffect(() => {
    void loadAppPreferences().then((p) => {
      const today = formatISODateMoscow(new Date(nowForBookingCompareMs()));
      if (p.lastBookingDateISO && p.lastBookingDateISO >= today) {
        setDateStart(p.lastBookingDateISO);
      }
      setPrefsLoaded(true);
    });
  }, []);

  useEffect(() => {
    const p = route.params?.prefill;
    if (p) {
      setPendingPrefill(p);
      const setParams = (
        navigation as { setParams?: (params: Partial<{ prefill?: BookingPrefillParams | undefined }>) => void }
      ).setParams;
      if (typeof setParams === 'function') {
        setParams({ prefill: undefined });
      }
    }
  }, [route.params?.prefill, navigation]);

  useEffect(() => {
    if (!pendingPrefill || !cafesQ.data?.length) return;
    const found = cafesQ.data.find((c) => c.icafe_id === pendingPrefill.icafeId);
    if (!found) return;
    setCafe(found);
    setMins(String(pendingPrefill.mins ?? 60));
    if (pendingPrefill.dateISO?.trim()) {
      setDateStart(pendingPrefill.dateISO.trim());
      setDateFilterCommitted(true);
    }
    if (pendingPrefill.timeHHmm?.trim()) {
      setTimeStart(pendingPrefill.timeHHmm.trim());
      setTimeDurationFilterCommitted(true);
    }
    if (pendingPrefill.openNearestSearch) {
      setNearestSearchTargetPcs([]);
      setModalNearestMenu(true);
      setNearestMenuPhase('form');
    }
    if (pendingPrefill.pcPickerMode === 'scheme' || pendingPrefill.pcPickerMode === 'list') {
      setSeatLayoutMode(pendingPrefill.pcPickerMode);
    }
    setSelectedPcs([]);
    if (!pendingPrefill.pcName?.trim()) {
      setPendingPrefill(null);
    }
  }, [pendingPrefill, cafesQ.data]);

  useEffect(() => {
    if (!prefsLoaded || !tariff || !cafe) return;
    const id = setTimeout(() => {
      void patchAppPreferences({
        favoriteClubId: cafe.icafe_id,
        lastTariff: tariffToSaved(tariff),
      });
    }, 500);
    return () => clearTimeout(id);
  }, [tariff, cafe, prefsLoaded]);

  useEffect(() => {
    if (!prefsLoaded || !cafesQ.data?.length) return;
    void loadAppPreferences().then((prefs) => {
      const id = prefs.lastBookingClubId ?? prefs.favoriteClubId;
      if (id != null) {
        const found = cafesQ.data!.find((c) => c.icafe_id === id);
        if (found) setCafe(found);
      }
    });
  }, [prefsLoaded, cafesQ.data]);

  /** Числовой member_id — для подписи POST /booking и отмены (как в реф. клиенте). */
  const memberIdNumericOk = useMemo(
    () => Boolean(user?.memberId && /^\d+$/.test(user.memberId.trim())),
    [user?.memberId],
  );
  /** Профиль вошёл: нужен для загрузки слотов/ПК (member_id может быть нестрого числовым в ответе API). */
  const memberProfileReady = useMemo(() => Boolean(user?.memberId?.trim()), [user?.memberId]);
  const signHintOk = useMemo(() => {
    return bookingSignReady({
      mode: getBookingKeyMode(),
      hasSecret: !!getContestSignSecret().trim(),
      hasPrivateKey: !!user?.privateKey?.trim(),
    });
  }, [user?.privateKey]);

  const minsNum = useMemo(() => {
    const n = Number(mins);
    return Number.isFinite(n) && n > 0 ? n : 60;
  }, [mins]);

  /** Дата/время для API (московский календарь и часы в UI). */
  const serverBookingDateTime = useMemo(
    () => moscowSelectionToServerDateTime(dateStart, timeStart),
    [dateStart, timeStart],
  );

  /** Планируемый интервал брони (МСК) — пересечения с любыми бронями клуба. */
  const planIv = useMemo(
    () => plannedInterval(dateStart, timeStart, minsNum),
    [dateStart, timeStart, minsNum],
  );

  const onAddBookingToCalendar = useCallback(async (pcLine: string) => {
    if (!cafe) return;
    const planStart = plannedInterval(dateStart, timeStart, minsNum)?.start;
    const eventId = await addBookingEventToCalendar({
      title: `BBplay · ${cafe.address}`,
      location: cafe.address,
      notes: `${pcLine}\n${dateStart} ${timeStart} · ${minsNum} min`,
      dateStart,
      timeStart,
      durationMins: minsNum,
      startDate: planStart,
    });
    if (eventId) {
      showAlert('', t('booking.calendarDone'));
      return;
    }
    const perm = await getCalendarPermissionsAsyncSafe();
    showAlert(
      '',
      !perm ? t('booking.calendarFail') : perm.status !== 'granted' ? t('booking.calendarDenied') : t('booking.calendarFail'),
    );
  }, [cafe, dateStart, timeStart, minsNum, t, showAlert]);

  const pricesQ = useQuery({
    queryKey: queryKeys.allPrices({
      cafeId: cafe?.icafe_id ?? 0,
      memberId: user?.memberId,
      mins: minsNum,
      bookingDate: serverBookingDateTime.date,
    }),
    queryFn: () =>
      bookingFlowApi.allPrices({
        cafeId: cafe!.icafe_id,
        memberId: user?.memberId,
        mins: minsNum,
        bookingDate: serverBookingDateTime.date,
      }),
    /** `/all-prices-icafe`: memberId опционален; без него тарифы/пакеты всё равно нужны для выбора. */
    enabled: !!cafe,
    staleTime: 2 * 60 * 1000,
  });

  const cafeBookingProductsQ = useQuery({
    queryKey: queryKeys.cafeBookingProducts(cafe?.icafe_id ?? 0),
    queryFn: () => fetchCafeBookingProducts(cafe!.icafe_id),
    /** Пробуем при любом залогиненном пользователе (Bearer: private_key или токен в сессии). */
    enabled: !!cafe && !!user,
    staleTime: 3 * 60 * 1000,
  });

  const productsRaw = pricesQ.data?.products ?? [];
  const cafeBookingProductsRaw = cafeBookingProductsQ.data ?? [];
  const useCafeBookingPackages =
    cafeBookingProductsQ.isSuccess && cafeBookingProductsRaw.length > 0;
  const products = useMemo(
    () =>
      mergeBookingProductsCatalog(productsRaw, cafeBookingProductsRaw, useCafeBookingPackages),
    [productsRaw, cafeBookingProductsRaw, useCafeBookingPackages],
  );
  /**
   * Пакеты для колеса: при успешном `GET .../cafe/{id}/products` — **только** этот список (реальные пакеты брони),
   * без строк из `/all-prices-icafe` на 30–120 мин («1 ч/пакет» и т.п.). Иначе — объединённый каталог, минус длительности почасовой сетки.
   */
  const catalogSessionPackageProducts = useMemo(() => {
    const fromCafe =
      cafeBookingProductsQ.isSuccess && cafeBookingProductsRaw.length > 0;
    const pool = fromCafe ? cafeBookingProductsRaw : products;
    const raw = filterBookingWheelPackageProducts(pool);
    return dedupeBookingWheelPackagesByDuration(raw, effectivePackageZone);
  }, [products, cafeBookingProductsQ.isSuccess, cafeBookingProductsRaw, effectivePackageZone]);

  /** Смена тарифа ПК / фильтра зоны: тот же срок (3 ч / 5 ч), но другой `product_id` под зону. */
  useEffect(() => {
    setTariff((prev) => {
      if (!prev || prev.kind !== 'product') return prev;
      const m = catalogProductSessionMins(prev.item);
      if (m == null || m <= 0 || !isDistinctBookingPackageWheelDuration(m)) return prev;
      const replacement = catalogSessionPackageProducts.find((p) => catalogProductSessionMins(p) === m);
      if (!replacement || replacement.product_id === prev.item.product_id) return prev;
      return { kind: 'product', item: replacement };
    });
  }, [catalogSessionPackageProducts]);

  const pricesList = pricesQ.data?.prices ?? [];
  const pricesListRef = useRef(pricesList);
  pricesListRef.current = pricesList;

  const termsTariffMatrix = useMemo(
    () =>
      buildTermsTariffMatrix(products, pricesList, (z) =>
        z === 'Other'
          ? t('booking.termsZoneStandard')
          : z === 'VIP'
            ? t('booking.zoneKindVIP')
            : z === 'BootCamp'
              ? t('booking.zoneKindBootCamp')
              : t('booking.zoneKindGameZone'),
      ),
    [products, pricesList, t],
  );

  const termsMatrixColLabels = useMemo(
    () => [t('booking.termsCol1h'), t('booking.termsCol2h'), t('booking.termsCol3h'), t('booking.termsCol5h')],
    [t],
  );

  const termsPricesSheetLayout = useMemo(() => {
    // На первом кадре (и отдельных платформах) `useWindowDimensions` иногда 0 — иначе maxHeight шторки 0, видна только картинка затемнения.
    const wh = windowHeight > 0 ? windowHeight : Dimensions.get('window').height;
    const safeH = wh > 0 ? wh : 667;
    const sheetMaxH = Math.max(280, Math.round(safeH * 0.85));
    return { sheetMaxH };
  }, [windowHeight]);

  /** Только почасовые пресеты 30–120 мин. Пакеты 3 ч / 5 ч — только строки каталога (iCafe `.../products` или `/all-prices-icafe`). */
  const durationPresetMinsList = useMemo(() => [...HOURLY_DURATION_PRESETS_BASE], []);

  /** В `/available-pcs-for-booking` параметр `priceName` — от почасовой строки (`price_name`), не от пакета (`product_name`). */
  const priceNameForAvailability = useMemo(
    () => (tariff?.kind === 'price' ? priceName.trim() : ''),
    [tariff?.kind, priceName],
  );

  const slotStep = useMemo(() => BOOKING_TIME_STEP_MINS, []);
  const tbStart = pricesQ.data?.time_tech_break?.startMins;
  const tbDur = pricesQ.data?.time_tech_break?.durationMins;
  const timeSlotOptions = useMemo(
    () => ({
      stepMins: slotStep,
      techBreak:
        tbStart != null &&
        tbDur != null &&
        Number.isFinite(tbStart) &&
        Number.isFinite(tbDur) &&
        tbDur > 0
          ? { startMins: tbStart, durationMins: tbDur }
          : null,
    }),
    [slotStep, tbStart, tbDur],
  );

  type DurationWheelEntry =
    | { kind: 'preset'; mins: number }
    | { kind: 'product'; product: ProductItem };

  const durationWheelEntries = useMemo((): DurationWheelEntry[] => {
    const pres: DurationWheelEntry[] = durationPresetMinsList.map((mins) => ({ kind: 'preset', mins }));
    const prods: DurationWheelEntry[] = catalogSessionPackageProducts.map((p) => ({
      kind: 'product',
      product: p,
    }));
    return [...pres, ...prods];
  }, [catalogSessionPackageProducts]);
  const durationWheelEntriesRef = useRef(durationWheelEntries);
  durationWheelEntriesRef.current = durationWheelEntries;

  const durationWheelItems = useMemo(
    () =>
      durationWheelEntries.map((e) =>
        e.kind === 'preset'
          ? presetDurationWheelLabel(e.mins, t, locale, pricesList, products, effectivePackageZone, showSavingBenefit)
          : productWheelLineLabel(e.product, locale, t, pricesList, products, effectivePackageZone, showSavingBenefit),
      ),
    [durationWheelEntries, locale, t, pricesList, products, effectivePackageZone, showSavingBenefit],
  );

  const zoneWheelLabels = useMemo(
    () => [
      t('booking.nearestAny'),
      t('booking.zoneKindVIP'),
      t('booking.zoneKindBootCamp'),
      t('booking.zoneKindGameZone'),
    ],
    [t],
  );

  const defaultSessionMins = useMemo(() => {
    if (!pricesList.length && catalogSessionPackageProducts.length > 0)
      return bookingPackageWheelDisplayMins(catalogSessionPackageProducts[0]!, 60);
    return 60;
  }, [pricesList.length, catalogSessionPackageProducts]);

  useEffect(() => {
    if (!cafe || !prefsLoaded) return;
    /** Пока прайс грузится под новый queryKey (дата/минуты), `products`/`pricesList` пустые — не сбрасывать выбор в шторке. */
    if (pricesQ.isPending) return;
    if (!products.length && !pricesList.length) {
      setTariff(null);
      setPriceName('');
      setTimeDurationFilterCommitted(false);
      return;
    }
    const scope = `${cafe.icafe_id}-${dateStart}`;
    if (tariffScopeInitRef.current === scope) return;
    tariffScopeInitRef.current = scope;
    void loadAppPreferences().then((prefs) => {
      if (!cafe || `${cafe.icafe_id}-${dateStart}` !== scope) return;
      const clubOk =
        prefs.lastBookingClubId === cafe.icafe_id || prefs.favoriteClubId === cafe.icafe_id;
      const restored =
        clubOk && prefs.lastTariff ? tariffFromSaved(prefs.lastTariff, pricesList, products) : null;
      const hourlyTpl = pickHourlyTemplateForSessionMins(pricesList, defaultSessionMins);
      const hourlyResolved =
        hourlyTpl != null ? matchPriceTierToMinutes(pricesList, hourlyTpl, defaultSessionMins) : null;
      const pick: TariffChoice | null =
        restored ??
        (hourlyResolved
          ? { kind: 'price', item: hourlyResolved }
          : catalogSessionPackageProducts[0]
            ? { kind: 'product', item: catalogSessionPackageProducts[0] }
            : pricesList[0]
              ? { kind: 'price', item: pricesList[0] }
              : null);
      if (pick) {
        setTariff(pick);
        setPriceName(tariffNameForApi(pick));
        setMins(bookingMinsAfterTariffSelect(pick, String(defaultSessionMins)));
      }
    });
  }, [cafe, dateStart, prefsLoaded, products, pricesList, defaultSessionMins, pricesQ.isPending]);

  useEffect(() => {
    if (pricesQ.isPending) return;
    if (!products.length && !pricesList.length) {
      setTariff(null);
      setPriceName('');
      setTimeDurationFilterCommitted(false);
      return;
    }
    setTariff((prev) => {
      if (!prev) return prev;
      if (
        prev.kind === 'product' &&
        products.some(
          (p) =>
            p.product_id === prev.item.product_id &&
            String(p.group_name ?? '') === String(prev.item.group_name ?? ''),
        )
      )
        return prev;
      if (prev.kind === 'price' && pricesList.some((p) => priceItemsEqual(p, prev.item))) return prev;
      const hourFallback = pickHourlyTemplateForSessionMins(pricesList, defaultSessionMins);
      const hourResolved =
        hourFallback != null ? matchPriceTierToMinutes(pricesList, hourFallback, defaultSessionMins) : null;
      const first: TariffChoice | null = hourResolved
        ? { kind: 'price', item: hourResolved }
        : catalogSessionPackageProducts[0]
          ? { kind: 'product', item: catalogSessionPackageProducts[0] }
          : pricesList[0]
            ? { kind: 'price', item: pricesList[0] }
            : null;
      if (first) {
        setPriceName(tariffNameForApi(first));
        setMins(bookingMinsAfterTariffSelect(first, String(defaultSessionMins)));
      }
      return first;
    });
  }, [products, pricesList, defaultSessionMins, pricesQ.isPending]);

  const structQ = useQuery({
    queryKey: queryKeys.structRooms(cafe?.icafe_id ?? 0),
    queryFn: () => bookingFlowApi.structRooms(cafe!.icafe_id),
    enabled: !!cafe,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  /** Та же каноническая схема зала, что в `preview/hall-zones-colors.html` — легенда и цвета. */
  const hallMapCanonicalLayout = useMemo(
    () => (cafe ? getHallMapTweak(cafe.icafe_id).canonicalColumns?.enabled === true : false),
    [cafe],
  );

  const availKey = useMemo(
    () =>
      queryKeys.availablePcs({
        cafeId: cafe?.icafe_id ?? 0,
        dateStart: serverBookingDateTime.date,
        timeStart: serverBookingDateTime.time,
        mins: minsNum,
        isFindWindow: IS_FIND_WINDOW_MAIN,
        priceName: priceNameForAvailability,
      }),
    [
      cafe?.icafe_id,
      serverBookingDateTime.date,
      serverBookingDateTime.time,
      minsNum,
      priceNameForAvailability,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      // На возврате во вкладку не делаем агрессивный hard refresh:
      // показываем кэш сразу, а обновление идет по интервалам query.
      if (user?.memberAccount?.trim() || user?.memberId?.trim()) {
        void qc.invalidateQueries({
          queryKey: queryKeys.books(user?.memberAccount, user?.memberId),
        });
      }
    }, [qc, user?.memberAccount, user?.memberId]),
  );

  /** Данные по ПК тянем только после подтверждения фильтров слота. */
  const pcDataFetchReady = Boolean(
    cafe &&
    memberProfileReady &&
    dateFilterCommitted &&
    timeDurationFilterCommitted &&
    tariff != null,
  );

  /** Слот брони: только vibe `GET /available-pcs-for-booking` (не iCafe `.../pcs`). */
  const pcsQuery = useQuery({
    queryKey: availKey,
    queryFn: () =>
      bookingFlowApi.availablePcs({
        cafeId: cafe!.icafe_id,
        dateStart: serverBookingDateTime.date,
        timeStart: serverBookingDateTime.time,
        mins: minsNum,
        isFindWindow: IS_FIND_WINDOW_MAIN,
        priceName: priceNameForAvailability || undefined,
      }),
    enabled: pcDataFetchReady && minsNum > 0 && !isBookingFilterSheetOpen,
    staleTime: 15_000,
    refetchOnMount: true,
    refetchInterval: isFocused && !isBookingFilterSheetOpen ? PC_REFETCH_INTERVAL_MS : false,
  });

  /** «Занят сейчас»: iCafe `member_pcs` → fallback `GET .../pcs` — не используется для доступности слота. */
  const livePcsQuery = useLivePcsQuery(
    cafe?.icafe_id,
    pcDataFetchReady && isFocused && !isBookingFilterSheetOpen,
  );

  const booksQ = useMemberBooksQuery(user?.memberAccount, user?.memberId);
  const hasMemberBookingHistory = useMemo(() => hasAnyMemberBookingRows(booksQ.data), [booksQ.data]);
  const myBookingsListCount = useMemo(
    () => countTotalMemberBookingsInData(booksQ.data),
    [booksQ.data],
  );
  const cafeBooksQ = useCafeBookingsQuery(
    cafe?.icafe_id,
    pcDataFetchReady && !isBookingFilterSheetOpen,
  );
  /** Пока не подтянули брони клуба (все участники), нельзя честно отметить места с пересечением по слоту. */
  const cafeBookingsOverlapLoading = !!(pcDataFetchReady && cafeBooksQ.isPending);
  const bookingNowMs = useBookingNowMs(Platform.OS === 'web' ? 45_000 : 15_000);

  /** Дата для сетки времени в шторке «время / длительность»: при открытом поиске «ближайшее окно» — день поиска или «сегодня» при «Без разницы». */
  const effectiveDateForTimeSlots = useMemo(() => {
    if (!modalNearestMenu) return dateStart;
    if (nearestSearchDayISO != null) return nearestSearchDayISO;
    return formatISODateMoscow(new Date(bookingNowMs));
  }, [modalNearestMenu, nearestSearchDayISO, dateStart, bookingNowMs]);
  effectiveDateForTimeSlotsRef.current = effectiveDateForTimeSlots;

  /** В поиске ближайшего окна при «Без разницы» по дню — полная сетка времени за день. */
  const nearestSearchFullDayTimeGrid = modalNearestMenu && nearestSearchDayISO == null;
  nearestSearchFullDayTimeGridRef.current = nearestSearchFullDayTimeGrid;

  /** Сетка времени на основной форме — только от `dateStart` (меню «ближ. окно» не пересчитывает её). */
  const mainTimeSlots = useMemo(
    () =>
      buildBookingTimeSlots(dateStart, {
        ...timeSlotOptions,
        fullDayIgnoreNow: false,
      }),
    [dateStart, timeSlotOptions],
  );
  mainTimeSlotsRef.current = mainTimeSlots;
  mainFormDateForSlotsRef.current = dateStart;

  const timeSlots = useMemo(
    () =>
      buildBookingTimeSlots(effectiveDateForTimeSlots, {
        ...timeSlotOptions,
        fullDayIgnoreNow: nearestSearchFullDayTimeGrid,
      }),
    [effectiveDateForTimeSlots, timeSlotOptions, nearestSearchFullDayTimeGrid],
  );
  const timeSlotsRef = useRef(timeSlots);
  timeSlotsRef.current = timeSlots;

  useEffect(() => {
    if (!mainTimeSlots.includes(timeStart) && mainTimeSlots.length) {
      setTimeStart(mainTimeSlots[0]!);
    }
  }, [dateStart, mainTimeSlots, timeStart]);

  /** Брони для пересечения слота: iCafe GET /bookings (если успех) ∪ all-books по клубу — дедуп; при ошибке iCafe — только «мои». */
  const memberBookingRowsForCafe = useMemo((): MemberBookingRow[] => {
    if (!cafe) return [];
    const raw = booksQ.data?.[String(cafe.icafe_id)];
    return Array.isArray(raw) ? raw : raw ? [raw as MemberBookingRow] : [];
  }, [cafe, booksQ.data]);

  const cafeBookingRowsForOverlap = useMemo((): MemberBookingRow[] => {
    if (!cafe) return [];
    const fromIcafe = cafeBooksQ.isSuccess ? (cafeBooksQ.data ?? []) : [];
    return mergeBookingRowsForCafeOverlap(cafe.icafe_id, fromIcafe, memberBookingRowsForCafe);
  }, [cafe, cafeBooksQ.isSuccess, cafeBooksQ.data, memberBookingRowsForCafe]);

  const datesList = useMemo(() => {
    const out: string[] = [];
    let day = formatISODateMoscow(new Date(bookingNowMs));
    for (let i = 0; i < 90; i++) {
      out.push(day);
      day = addCalendarDaysMoscow(day, 1);
    }
    return out;
  }, [bookingNowMs]);

  useEffect(() => {
    if (nearestSearchDayISO == null) return;
    const first = datesList[0];
    if (first && nearestSearchDayISO < first) setNearestSearchDayISO(first);
  }, [datesList, nearestSearchDayISO]);

  const cancelBookingMut = useCancelBookingMutation();

  const sessionQ = useQuery<MemberPcSessionInfo, Error>({
    queryKey: ['member-pc-session', cafe?.icafe_id, user?.memberId],
    queryFn: () => fetchMemberPcSessionInfo(cafe!.icafe_id, user!.memberId),
    enabled: Boolean(pcDataFetchReady && user?.memberId && isFocused && !isBookingFilterSheetOpen),
    staleTime: 15_000,
    refetchInterval: isBookingFilterSheetOpen ? false : 28_000,
  });

  const pcs = pcsQuery.data?.pc_list ?? null;

  const pcsForUi = useMemo(() => {
    if (!pcs) return null;
    if (bookingMapZoneFilter.mode === 'any') return pcs;
    return pcs.filter((p) => pcMatchesNearestZoneFilter(p, bookingMapZoneFilter));
  }, [pcs, bookingMapZoneFilter]);

  /** Режим списка: группируем по зонам и в каждой зоне рендерим по 2 карточки в ряд. */
  const pcListSections = useMemo<PcListSection[]>(() => {
    const list = pcsForUi ?? [];
    const byZone: Record<PcZoneKind, PcListItem[]> = {
      VIP: [],
      BootCamp: [],
      GameZone: [],
      Other: [],
    };
    for (const item of list) {
      byZone[pcZoneKindFromPc(item)].push(item);
    }

    const buildPairs = (zoneItems: PcListItem[]) => {
      const rows: PcListItem[][] = [];
      for (let i = 0; i < zoneItems.length; i += 2) {
        rows.push(zoneItems.slice(i, i + 2));
      }
      return rows;
    };

    return [
      {
        key: 'GameZone' as const,
        title: t('booking.zoneKindGameZone'),
        pairs: buildPairs(byZone.GameZone),
      },
      {
        key: 'BootCamp' as const,
        title: t('booking.zoneKindBootCamp'),
        pairs: buildPairs(byZone.BootCamp),
      },
      { key: 'VIP' as const, title: t('booking.zoneKindVIP'), pairs: buildPairs(byZone.VIP) },
      { key: 'Other' as const, title: t('booking.zoneKindOther'), pairs: buildPairs(byZone.Other) },
    ].filter((section) => section.pairs.length > 0);
  }, [pcsForUi, t]);

  const pcListRows = useMemo<PcFlatListRow[]>(() => {
    const rows: PcFlatListRow[] = [];
    for (const section of pcListSections) {
      section.pairs.forEach((pair, idx) => {
        rows.push({
          key: `pc-row-${section.key}-${idx}`,
          sectionTitle: section.title,
          showSectionTitle: idx === 0,
          pair,
        });
      });
    }
    return rows;
  }, [pcListSections]);

  const pcsForNearestSearchUi = useMemo(() => {
    if (!pcs) return null;
    if (nearestZoneFilter.mode === 'any') return pcs;
    return pcs.filter((p) => pcMatchesNearestZoneFilter(p, nearestZoneFilter));
  }, [pcs, nearestZoneFilter]);

  const pcListSectionsForNearest = useMemo(() => {
    const list = pcsForNearestSearchUi ?? [];
    const byZone: Record<PcZoneKind, PcListItem[]> = {
      VIP: [],
      BootCamp: [],
      GameZone: [],
      Other: [],
    };
    for (const item of list) {
      byZone[pcZoneKindFromPc(item)].push(item);
    }

    const buildPairs = (zoneItems: PcListItem[]) => {
      const rows: PcListItem[][] = [];
      for (let i = 0; i < zoneItems.length; i += 2) {
        rows.push(zoneItems.slice(i, i + 2));
      }
      return rows;
    };

    return [
      { key: 'GameZone' as const, title: t('booking.zoneKindGameZone'), pairs: buildPairs(byZone.GameZone) },
      { key: 'BootCamp' as const, title: t('booking.zoneKindBootCamp'), pairs: buildPairs(byZone.BootCamp) },
      { key: 'VIP' as const, title: t('booking.zoneKindVIP'), pairs: buildPairs(byZone.VIP) },
      { key: 'Other' as const, title: t('booking.zoneKindOther'), pairs: buildPairs(byZone.Other) },
    ].filter((section) => section.pairs.length > 0);
  }, [pcsForNearestSearchUi, t]);

  const nearestSearchPcTariffLabel = useMemo(() => {
    if (nearestSearchPcZone === 'any') return t('booking.nearestAny');
    if (nearestSearchPcZone === 'VIP') return t('booking.zoneKindVIP');
    if (nearestSearchPcZone === 'BootCamp') return t('booking.zoneKindBootCamp');
    return t('booking.zoneKindGameZone');
  }, [nearestSearchPcZone, t]);

  const allMapPcNames = useMemo(() => {
    const s = new Set<string>();
    for (const p of pcs ?? []) s.add(p.pc_name);
    if (structQ.data?.rooms) {
      for (const r of structQ.data.rooms) {
        for (const sp of r.pcs_list ?? []) s.add(sp.pc_name);
      }
    }
    return s;
  }, [pcs, structQ.data?.rooms]);

  const nearestSearchPcMapAvailability = useMemo(() => {
    const map: Record<string, PcAvailabilityState> = {};
    if (nearestSearchTargetPcs.length === 0) {
      for (const pcName of allMapPcNames) {
        map[pcName] = 'free';
      }
      return map;
    }
    const selected = new Set(nearestSearchTargetPcs.map((x) => String(x.pc_name).trim().toLowerCase()));
    for (const pcName of allMapPcNames) {
      const lk = String(pcName).trim().toLowerCase();
      map[pcName] = selected.has(lk) ? 'selected' : 'free';
    }
    return map;
  }, [allMapPcNames, nearestSearchTargetPcs]);

  const slotByLower = useMemo(() => {
    const m = new Map<string, PcListItem>();
    for (const p of pcs ?? []) {
      m.set(String(p.pc_name).trim().toLowerCase(), p);
    }
    return m;
  }, [pcs]);

  const liveUsingByLower = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const p of livePcsQuery.data ?? []) {
      m.set(String(p.pc_name).trim().toLowerCase(), !!p.is_using);
    }
    return m;
  }, [livePcsQuery.data]);

  /**
   * ПК, на которых любая бронь клуба пересекается с выбранным слотом (GET iCafe `/bookings` + fallback на all-books).
   */
  const planOverlapBusyPcsLower = useMemo(() => {
    if (!planIv) return new Set<string>();
    return pcLowerNamesWithBookingOverlappingPlan(cafeBookingRowsForOverlap, planIv, bookingNowMs);
  }, [cafeBookingRowsForOverlap, planIv, bookingNowMs]);

  useEffect(() => {
    if (!pendingPrefill || !pcs || pcsQuery.isFetching) return;
    const prefillDate = pendingPrefill.dateISO?.trim() ?? null;
    const prefillTime = pendingPrefill.timeHHmm?.trim() ?? null;
    const prefillAligned =
      cafe?.icafe_id === pendingPrefill.icafeId &&
      (!prefillDate || prefillDate === dateStart) &&
      (!prefillTime || prefillTime === timeStart);
    // Ждём, пока фильтры экрана применят prefill (клуб/дата/время),
    // иначе можно попытаться выбрать ПК по старому списку и потерять pendingPrefill.
    if (!prefillAligned) return;
    const wantPc = pendingPrefill.pcName?.trim();
    if (!wantPc) return;
    const m = pcs.find((x) => {
      if (!pcNamesLooselyEqual(x.pc_name, wantPc)) return false;
      const lk = String(x.pc_name).trim().toLowerCase();
      if (planOverlapBusyPcsLower.has(lk)) return false;
      if (!planIv) return !x.is_using;
      return !effectivePcBusyForPlan(x, planIv, bookingNowMs);
    });
    if (m) {
      setSelectedPcs([m]);
      setPendingPrefill(null);
      return;
    }
    if (pcs.length > 0) {
      setPendingPrefill(null);
    }
  }, [
    pendingPrefill,
    cafe?.icafe_id,
    pcs,
    pcsQuery.isFetching,
    dateStart,
    timeStart,
    planIv,
    bookingNowMs,
    planOverlapBusyPcsLower,
  ]);

  /**
   * Смена клуба / даты / времени / длительности / тарифа — выбранные ПК сбрасываем (слот и цены другие).
   * Для длинных пакетов (3ч/5ч/...) не учитываем `product_id` в сигнатуре: при выборе VIP/BootCamp ПК
   * пакет автоматически перескакивает на зональную строку каталога, и это не должно сбрасывать выбор ПК.
   */
  const bookingFilterTariffKey = useMemo(() => {
    if (!tariff) return null;
    if (tariff.kind === 'product') {
      const packageMins = catalogProductSessionMins(tariff.item);
      if (packageMins != null && packageMins > 0 && isDistinctBookingPackageWheelDuration(packageMins)) {
        return { kind: 'product', packageMins };
      }
    }
    return tariffToSaved(tariff);
  }, [tariff]);

  const bookingFilterSignature = useMemo(
    () =>
      JSON.stringify({
        clubId: cafe?.icafe_id ?? null,
        date: dateStart,
        time: timeStart,
        mins: minsNum,
        tariff: bookingFilterTariffKey,
      }),
    [cafe?.icafe_id, dateStart, timeStart, minsNum, bookingFilterTariffKey],
  );
  const bookingFilterSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (bookingFilterSignatureRef.current === null) {
      bookingFilterSignatureRef.current = bookingFilterSignature;
      return;
    }
    if (bookingFilterSignatureRef.current !== bookingFilterSignature) {
      bookingFilterSignatureRef.current = bookingFilterSignature;
      setSelectedPcs([]);
    }
  }, [bookingFilterSignature]);

  useEffect(() => {
    if (!pcs) return;
    setSelectedPcs((prev) =>
      prev.filter((s) => {
        const lk = String(s.pc_name).trim().toLowerCase();
        if (planOverlapBusyPcsLower.has(lk)) return false;
        return pcs.some((p) => {
          if (!pcNamesLooselyEqual(p.pc_name, s.pc_name)) return false;
          if (!planIv) return !p.is_using;
          return !effectivePcBusyForPlan(p, planIv, bookingNowMs);
        });
      }),
    );
  }, [pcs, planOverlapBusyPcsLower, planIv, bookingNowMs]);

  /** Время+длительность из шторки без действующего тарифа (см. эффекты `setTariff(null)` при пустом прайсе) не считаем завершённым выбором. */
  const timeAndDurationReady = Boolean(timeDurationFilterCommitted && tariff != null);

  /** Тариф ПК на основном экране не фильтрует места; для поиска ближайшего окна зона подтверждается в отдельном меню. */
  const pcTierFilterReady = true;

  const canSelectPc = useMemo(
    () =>
      !!cafe &&
      memberProfileReady &&
      dateFilterCommitted &&
      timeAndDurationReady &&
      pcTierFilterReady,
    [cafe, memberProfileReady, dateFilterCommitted, timeAndDurationReady, pcTierFilterReady],
  );

  const pcAvailability = useMemo(() => {
    const map: Record<string, PcAvailabilityState> = {};
    /**
     * Пока дата/время не подтверждены, в state всё равно есть дефолтный слот — без этого условия схема
     * красит места «занято» по невыбранному пользователем интервалу.
     */
    if (!canSelectPc) {
      for (const pcName of allMapPcNames) {
        map[pcName] = 'free';
      }
      return map;
    }
    for (const pcName of allMapPcNames) {
      const lk = String(pcName).trim().toLowerCase();
      const sel = selectedPcs.some((s) => String(s.pc_name).trim().toLowerCase() === lk);
      if (sel) {
        map[pcName] = 'selected';
        continue;
      }
      if (planOverlapBusyPcsLower.has(lk)) {
        map[pcName] = 'busy';
        continue;
      }
      const slot = slotByLower.get(lk);
      if (!slot) {
        map[pcName] = pcsQuery.isPending || pcsQuery.isFetching ? 'free' : 'unknown';
        continue;
      }
      if (planIv && pcListItemBlocksPlannedSlot(slot, planIv, bookingNowMs)) {
        map[pcName] = 'busy';
        continue;
      }
      if (liveUsingByLower.get(lk) || slot.is_using) {
        map[pcName] = 'liveBusy';
        continue;
      }
      map[pcName] = 'free';
    }
    return map;
  }, [
    allMapPcNames,
    slotByLower,
    liveUsingByLower,
    selectedPcs,
    planOverlapBusyPcsLower,
    planIv,
    bookingNowMs,
    pcsQuery.isPending,
    pcsQuery.isFetching,
    canSelectPc,
  ]);

  const selectedPcsSet = useMemo(() => {
    const set = new Set<string>();
    for (const item of selectedPcs) {
      set.add(String(item.pc_name).trim().toLowerCase());
    }
    return set;
  }, [selectedPcs]);

  const busyUntilByPc = useMemo(() => {
    const map = new Map<string, Date | null>();
    for (const item of pcsForUi ?? []) {
      const lk = String(item.pc_name).trim().toLowerCase();
      const slotBusy =
        planOverlapBusyPcsLower.has(lk) ||
        (planIv ? effectivePcBusyForPlan(item, planIv, bookingNowMs) : item.is_using);
      map.set(
        lk,
        slotBusy
          ? busyUntilInstantForPcListItem(item, planIv, cafeBookingRowsForOverlap, bookingNowMs)
          : null,
      );
    }
    return map;
  }, [pcsForUi, planOverlapBusyPcsLower, planIv, bookingNowMs, cafeBookingRowsForOverlap]);

  const pcStatusByPc = useMemo(() => {
    const map = new Map<string, PcStatusMeta>();
    for (const item of pcsForUi ?? []) {
      const lk = String(item.pc_name).trim().toLowerCase();
      const busyUntil = busyUntilByPc.get(lk) ?? null;
      const slotBusy =
        planOverlapBusyPcsLower.has(lk) ||
        (planIv ? effectivePcBusyForPlan(item, planIv, bookingNowMs) : item.is_using);
      const statusLine =
        busyUntil != null
          ? t('booking.pcStatusBusyAfter', {
              time: formatInstantMoscowWallForLocale(busyUntil, locale),
            })
          : slotBusy
            ? t('booking.pcStatusBusy')
            : t('booking.pcStatusFree');
      map.set(lk, {
        selected: selectedPcsSet.has(lk),
        busy: slotBusy,
        statusLine,
      });
    }
    return map;
  }, [
    pcsForUi,
    busyUntilByPc,
    planOverlapBusyPcsLower,
    planIv,
    bookingNowMs,
    selectedPcsSet,
    t,
    locale,
  ]);

  const renderPcListRow = useCallback(
    ({ item }: ListRenderItemInfo<PcFlatListRow>) => (
      <BookingPcListRow
        row={item}
        styles={styles}
        colors={colors}
        canSelectPc={canSelectPc}
        pcStatusByPc={pcStatusByPc}
        onPressPc={togglePcSelection}
        uiPcLabel={uiPcLabel}
        t={t}
      />
    ),
    [styles, colors, canSelectPc, pcStatusByPc, togglePcSelection, uiPcLabel, t],
  );

  const nearestSearchZoneReady =
    nearestSearchPcZone === 'any' || nearestSearchPcZoneCommitted;

  const alertSelectPcBlockedIfNeeded = useCallback(() => {
    if (!cafe) {
      showAlert(t('booking.alertPc'), t('booking.selectPcBlockedNeedClub'));
      return;
    }
    if (!memberProfileReady) {
      showAlert(t('booking.alertPc'), t('booking.selectPcBlockedNeedProfile'));
      return;
    }
    if (!dateFilterCommitted) {
      showAlert(t('booking.alertPc'), t('booking.selectPcBlockedNeedDate'));
      return;
    }
    if (!timeAndDurationReady) {
      showAlert(t('booking.alertPc'), t('booking.selectPcBlockedNeedTimeDuration'));
      return;
    }
  }, [
    cafe,
    memberProfileReady,
    dateFilterCommitted,
    timeAndDurationReady,
    t,
    showAlert,
  ]);

  const pcSelectionLockHint = useMemo(() => {
    if (!cafe) return t('booking.selectPcBlockedNeedClub');
    if (!memberProfileReady) return t('booking.selectPcBlockedNeedProfile');
    if (!dateFilterCommitted) return t('booking.selectPcBlockedNeedDate');
    if (!timeAndDurationReady) return t('booking.selectPcBlockedNeedTimeDuration');
    return '';
  }, [
    cafe,
    memberProfileReady,
    dateFilterCommitted,
    timeAndDurationReady,
    t,
  ]);

  useEffect(() => {
    if (!canSelectPc) {
      setSelectedPcs((prev) => (prev.length ? [] : prev));
    }
  }, [canSelectPc]);

  const togglePcSelection = useCallback(
    (item: PcListItem) => {
      if (!canSelectPc) {
        alertSelectPcBlockedIfNeeded();
        return;
      }
      const lk = String(item.pc_name).trim().toLowerCase();
      if (planOverlapBusyPcsLower.has(lk)) return;
      if (planIv ? effectivePcBusyForPlan(item, planIv, bookingNowMs) : item.is_using) return;

      setSelectedPcs((prev) => {
        const i = prev.findIndex((p) => p.pc_name === item.pc_name);
        if (i >= 0) {
          return prev.filter((_, idx) => idx !== i);
        }
        return [...prev, item];
      });
    },
    [
      alertSelectPcBlockedIfNeeded,
      bookingNowMs,
      canSelectPc,
      planIv,
      planOverlapBusyPcsLower,
      t,
    ],
  );

  const onMapPcPress = useCallback(
    (pcName: string) => {
      const item = pcs?.find((p) => pcNamesLooselyEqual(p.pc_name, pcName));
      if (item) togglePcSelection(item);
    },
    [pcs, togglePcSelection],
  );

  const onNearestSearchMapPress = useCallback(
    (pcName: string) => {
      const item = pcs?.find((p) => pcNamesLooselyEqual(p.pc_name, pcName));
      if (!item) return;
      if (!pcMatchesNearestZoneFilter(item, nearestZoneFilter)) return;
      setNearestSearchTargetPcs((prev) => {
        if (prev.some((x) => pcNamesLooselyEqual(x.pc_name, item.pc_name))) {
          return prev.filter((x) => !pcNamesLooselyEqual(x.pc_name, item.pc_name));
        }
        return [...prev, item];
      });
    },
    [pcs, nearestZoneFilter],
  );

  const toggleNearestTargetPc = useCallback((item: PcListItem) => {
    if (!pcMatchesNearestZoneFilter(item, nearestZoneFilter)) return;
    setNearestSearchTargetPcs((prev) => {
      if (prev.some((x) => pcNamesLooselyEqual(x.pc_name, item.pc_name))) {
        return prev.filter((x) => !pcNamesLooselyEqual(x.pc_name, item.pc_name));
      }
      return [...prev, item];
    });
  }, [nearestZoneFilter]);

  const confirmCancelMemberBooking = useCallback((row: MemberBookingRow, icafeIdStr: string) => {
    setBookingsCancelConfirm({ row, icafeIdStr });
  }, []);

  const executeBookingsCancel = useCallback(() => {
    if (!bookingsCancelConfirm) return;
    const { row, icafeIdStr } = bookingsCancelConfirm;
    const offerId = memberOfferIdForApi(row);
    const icafeId = Number(icafeIdStr);
    const key = memberBookingRowStableKey(icafeIdStr, row);
    setBookingsCancelConfirm(null);
    setCancellingBookKey(key);
    cancelBookingMut.mutate(
      { icafeId, pcName: row.product_pc_name, memberOfferId: offerId },
      {
        onSettled: () => setCancellingBookKey(null),
        onSuccess: () => {
          const iv = intervalFromMemberRow(row);
          if (!iv) {
            void cancelBookingScheduledReminders();
            return;
          }
          void cancelScheduledRemindersForCancelledBooking({
            icafeId,
            visitStartMs: iv.start.getTime(),
          });
        },
        onError: (err) => {
          const msg = formatPublicErrorMessage(err, t, 'booking.errorGeneric');
          showAlert(t('booking.errorGeneric'), msg);
        },
      },
    );
  }, [bookingsCancelConfirm, cancelBookingMut, t]);

  useEffect(() => {
    if (!modalBooks) {
      setBookingsCancelConfirm(null);
      setMyBookingsPullRefresh(false);
    }
  }, [modalBooks]);

  useEffect(() => {
    if (!modalNearestMenu) setModalNearestDay(false);
  }, [modalNearestMenu]);

  useEffect(() => {
    if (modalBooks && (user?.memberAccount?.trim() || user?.memberId?.trim())) void booksQ.refetch();
  }, [modalBooks, user?.memberAccount, user?.memberId, booksQ.refetch]);

  const overlapConflict = useMemo(() => {
    if (!cafe || !selectedPcs.length || !cafeBookingRowsForOverlap.length || !planIv) return null;
    for (const sel of selectedPcs) {
      const row = findOverlappingBookingForPc(cafeBookingRowsForOverlap, sel.pc_name, planIv);
      if (row) {
        const iv = intervalFromMemberRow(row);
        if (iv) return { pcName: sel.pc_name, row, iv };
      }
    }
    return null;
  }, [cafe, selectedPcs, cafeBookingRowsForOverlap, planIv]);

  const overlapWithExistingBookings = !!overlapConflict;

  /** Пока дата/время не подтверждены в шторках, в стейте лежат «технические» значения по умолчанию — их нельзя сравнивать с бронями, иначе ложный баннер «пересечение». */
  const accountOverlapBooking = useMemo(() => {
    if (!dateFilterCommitted || !timeAndDurationReady) return null;
    const plan = plannedInterval(dateStart, timeStart, minsNum);
    if (!plan || !booksQ.data) return null;
    return findOverlappingOutstandingBooking(booksQ.data, plan, bookingNowMs);
  }, [booksQ.data, dateStart, timeStart, minsNum, bookingNowMs, dateFilterCommitted, timeAndDurationReady]);

  /** Сообщение вместо кнопки «Забронировать» при невозможности брони из‑за пересечения. */
  const bookPrimaryBlockReason: 'own_overlap' | 'seat_overlap' | null = useMemo(() => {
    if (accountOverlapBooking) return 'own_overlap';
    if (overlapWithExistingBookings && overlapConflict) return 'seat_overlap';
    return null;
  }, [accountOverlapBooking, overlapWithExistingBookings, overlapConflict]);

  /** Ужимаем схему зала, когда сверху/снизу появляются высокие блоки — чтобы кнопки брони чаще оставались на экране без прокрутки. */
  const hallMapMinHeight = useMemo(() => {
    const base = hallMapCanonicalLayout ? 320 : 280;
    let h = base;
    let tight = false;
    if (seatLayoutMode === 'scheme' && selectedPcs.length > 0) {
      h -= 36;
      tight = true;
    }
    if (overlapWithExistingBookings && overlapConflict) {
      h -= 44;
      tight = true;
    }
    if (tight) {
      h = Math.min(h, Math.round(windowHeight * 0.38));
    }
    return Math.max(200, h);
  }, [
    hallMapCanonicalLayout,
    seatLayoutMode,
    selectedPcs.length,
    overlapWithExistingBookings,
    overlapConflict,
    windowHeight,
  ]);

  const describeNearestSlotCandidate = useCallback(
    (c: NearestWindowCandidate) => {
      const lockedPcNames = nearestSearchTargetPcs.map((p) => p.pc_name).filter((x) => x.trim().length > 0);
      const requestedPartySize = lockedPcNames.length > 0
        ? lockedPcNames.length
        : selectedPcs.length > 0
          ? selectedPcs.length
          : 1;
      const slot = snapWindowToBookableSlot(c.windowStart, timeSlotOptions);
      const planIv = plannedInterval(slot.dateISO, slot.timeStart, minsNum);
      const pcsWithoutKnownOverlap =
        planIv == null
          ? c.data.pc_list ?? []
          : (c.data.pc_list ?? []).filter(
              (p) => findOverlappingBookingForPc(cafeBookingRowsForOverlap, p.pc_name, planIv) == null,
            );
      const picked =
        planIv != null
          ? lockedPcNames.length > 0
            ? pickSpecificPcsForPlan(
                pcsWithoutKnownOverlap,
                planIv,
                nearestZoneFilter,
                lockedPcNames,
                bookingNowMs,
              )
            : pickPcsForPartyForPlan(
                pcsWithoutKnownOverlap,
                planIv,
                nearestZoneFilter,
                requestedPartySize,
                bookingNowMs,
              )
          : [];
      const dateLabel = formatMoscowCalendarDayLong(slot.dateISO, locale === 'en' ? 'en' : 'ru');
      const timeLabel = formatMoscowWallSlotForLocale(slot.dateISO, slot.timeStart, locale === 'en' ? 'en' : 'ru');
      const whenLabel = t('booking.nearestWhenHuman', { date: dateLabel, time: timeLabel });
      const durationLabel = formatBookingDurationHuman(minsNum, locale);
      const pcsLabel = picked.length ? uiPcList(picked.map((p) => p.pc_name)) : '—';
      return {
        slot,
        whenLabel,
        durationLabel,
        pcsLabel,
        picked,
        isBookable: picked.length >= requestedPartySize,
        serverFrame: c.data.time_frame?.trim() || '',
      };
    },
    [
      timeSlotOptions,
      minsNum,
      nearestZoneFilter,
      bookingNowMs,
      locale,
      cafeBookingRowsForOverlap,
      t,
      selectedPcs,
      nearestSearchTargetPcs,
    ],
  );

  const nearestSlotsMut = useMutation({
    mutationFn: async () => {
      if (!cafe) throw new Error(t('booking.sessionNeedsClub'));
      if (!tariff || !Number.isFinite(minsNum) || minsNum <= 0) {
        throw new Error(t('booking.durationNotChosen'));
      }
      nearestSearchAbortRef.current?.abort();
      const ac = new AbortController();
      nearestSearchAbortRef.current = ac;
      try {
        const lockedPcNames = nearestSearchTargetPcs.map((p) => p.pc_name).filter((x) => x.trim().length > 0);
        const requestedPartySize =
          lockedPcNames.length > 0 ? lockedPcNames.length : selectedPcs.length > 0 ? selectedPcs.length : 1;
        return await findNearestClubWindows(
          cafe,
          {
            mins: minsNum,
            priceName: priceNameForAvailability || undefined,
            partySize: requestedPartySize,
            zoneFilter: nearestZoneFilter,
            searchDayIsoMoscow: nearestSearchDayISO,
            earliestStartMoscow:
              nearestSearchTimeAny ? null : { date: effectiveDateForTimeSlots, time: timeStart },
            bookableSlotOptions: timeSlotOptions,
            lockedPcNames,
            lockedPcSnapshots: nearestSearchTargetPcs,
          },
          {
            maxSlots: 3,
            bookingNowMs,
            stepAdvanceMins: slotStep,
            // На мобилках ответ /available-pcs-for-booking доходит дольше; 2.5s — часто 1–2 итерации и пустой результат.
            maxSearchMs: 10_000,
            signal: ac.signal,
          },
        );
      } finally {
        if (nearestSearchAbortRef.current === ac) nearestSearchAbortRef.current = null;
      }
    },
    onSuccess: (candidates) => {
      const safeCandidates = candidates
        .filter((c) => describeNearestSlotCandidate(c).isBookable)
        .slice(0, 3);
      setNearestSlotResults(safeCandidates);
      setNearestMenuPhase('results');
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.name === 'AbortError') return;
      const msg = formatPublicErrorMessage(e, t, 'booking.errorGeneric');
      showAlert(t('booking.alertBooking'), msg);
    },
  });

  const applyNearestSlotCandidate = useCallback(
    (c: NearestWindowCandidate) => {
      const { slot, picked } = describeNearestSlotCandidate(c);
      const requestedPartySize = nearestSearchTargetPcs.length > 0
        ? nearestSearchTargetPcs.length
        : selectedPcs.length > 0
          ? selectedPcs.length
          : 1;
      if (picked.length < requestedPartySize) {
        showAlert(t('booking.alertBooking'), t('booking.errorPcStale'));
        return;
      }
      setDateStart(slot.dateISO);
      setTimeStart(slot.timeStart);
      setDateFilterCommitted(true);
      setTimeDurationFilterCommitted(true);
      setSelectedPcs(picked);
      setNearestSearchTargetPcs([]);
      setNearestMenuPhase('form');
      setModalNearestMenu(false);
      void qc.invalidateQueries({
        queryKey: queryKeys.allPrices({
          cafeId: c.cafe.icafe_id,
          memberId: user?.memberId,
          mins: minsNum,
          bookingDate: moscowSelectionToServerDateTime(slot.dateISO, slot.timeStart).date,
        }),
      });
    },
    [qc, user?.memberId, describeNearestSlotCandidate, minsNum, t, selectedPcs, nearestSearchTargetPcs],
  );

  const bookMut = useMutation({
    mutationFn: async () => {
      if (!cafe || !user) throw new Error(t('booking.errorNoData'));
      if (!memberIdNumericOk) throw new Error(t('booking.errorMemberId'));
      const m = minsNum;
      if (!Number.isFinite(m) || m <= 0) throw new Error(t('booking.errorDurationBad'));
      if (!tariff) throw new Error(t('booking.errorNoTariff'));
      const list = selectedPcs;
      const fresh = await qc.fetchQuery({
        queryKey: availKey,
        queryFn: () =>
          bookingFlowApi.availablePcs({
            cafeId: cafe.icafe_id,
            dateStart: serverBookingDateTime.date,
            timeStart: serverBookingDateTime.time,
            mins: m,
            isFindWindow: IS_FIND_WINDOW_MAIN,
            priceName: priceNameForAvailability || undefined,
          }),
      });
      const byName = new Map((fresh?.pc_list ?? []).map((p) => [p.pc_name, p]));
      const plan = plannedInterval(serverBookingDateTime.date, serverBookingDateTime.time, m);
      const toBook: PcListItem[] = [];
      for (const pc of list) {
        const row = byName.get(pc.pc_name);
        if (!row || (plan ? effectivePcBusyForPlan(row, plan) : row.is_using)) {
          throw new Error(t('booking.errorPcStale'));
        }
        toBook.push(row);
      }
      const ok: string[] = [];
      const failed: { name: string; err: string }[] = [];

      const priced: { pc: PcListItem; tariffIds: BookingTariffApiIds }[] = [];
      for (const pc of toBook) {
        const tariffIds = bookingTariffIdsForApi(tariff, pc, pricesList, products, m);
        if (tariffIds == null) {
          failed.push({
            name: pc.pc_name,
            err: t('booking.zonePriceMissing', { zone: formatPublicZoneLabel(pcZoneLabel(pc) || '', t) }),
          });
        } else {
          priced.push({ pc, tariffIds });
        }
      }

      const common = {
        icafe_id: cafe.icafe_id,
        member_account: user.memberAccount,
        member_id: user.memberId,
        start_date: serverBookingDateTime.date,
        start_time: serverBookingDateTime.time,
        mins: m,
        private_key: user.privateKey,
      };

      const pushBookingError = (pcName: string, e: unknown) => {
        const errMsg = formatPublicErrorMessage(e, t, 'booking.errorGeneric');
        failed.push({ name: pcName, err: errMsg });
      };

      if (priced.length === 0) {
        return { ok, failed };
      }

      if (priced.length === 1) {
        const { pc, tariffIds } = priced[0]!;
        try {
          await bookingFlowApi.createBooking({
            ...common,
            pc_name: pc.pc_name,
            ...(tariffIds.kind === 'product' ? { product_id: tariffIds.product_id } : {}),
          });
          ok.push(pc.pc_name);
        } catch (e) {
          pushBookingError(pc.pc_name, e);
        }
        return { ok, failed };
      }

      /** Несколько ПК: один атомарный `POST /booking-batch`; при отсутствии маршрута (404) — откат на цепочку `POST /booking`. */
      try {
        await bookingFlowApi.createBookingBatch({
          ...common,
          bookings: priced.map(({ pc, tariffIds }) => ({
            pc_name: pc.pc_name,
            ...(tariffIds.kind === 'product' ? { product_id: tariffIds.product_id } : {}),
          })),
        });
        ok.push(...priced.map((p) => p.pc.pc_name));
      } catch (e) {
        const batch404 = e instanceof ApiError && e.status === 404;
        if (!batch404) throw e;
        for (const { pc, tariffIds } of priced) {
          try {
            await bookingFlowApi.createBooking({
              ...common,
              pc_name: pc.pc_name,
              ...(tariffIds.kind === 'product' ? { product_id: tariffIds.product_id } : {}),
            });
            ok.push(pc.pc_name);
          } catch (err) {
            pushBookingError(pc.pc_name, err);
          }
        }
      }
      return { ok, failed };
    },
    onSuccess: async (result) => {
      const refreshCachesAfterBooking = () => {
        void (async () => {
          try {
            await Promise.all([
              qc.refetchQueries({ queryKey: queryKeys.books(user?.memberAccount, user?.memberId) }),
              qc.refetchQueries({ queryKey: availKey }),
              cafe ? qc.invalidateQueries({ queryKey: queryKeys.cafeBookings(cafe.icafe_id) }) : Promise.resolve(),
              cafe ? qc.invalidateQueries({ queryKey: queryKeys.structRooms(cafe.icafe_id) }) : Promise.resolve(),
              cafe ? qc.invalidateQueries({ queryKey: queryKeys.livePcs(cafe.icafe_id) }) : Promise.resolve(),
              cafe ? qc.invalidateQueries({ queryKey: ['member-pc-session', cafe.icafe_id, user?.memberId] }) : Promise.resolve(),
            ]);
          } catch {
            /* бронь уже создана; обновление кэша — best effort */
          }
        })();
      };

      if (result.ok.length === 0 && result.failed.length) {
        showAlert(t('booking.alertBooking'), result.failed[0].err);
        refreshCachesAfterBooking();
        return;
      }
      const partial = result.failed.length > 0 && result.ok.length > 0;
      if (partial) {
        showAlert(
          t('booking.partialBookingTitle'),
          t('booking.partialBookingBody', {
            ok: uiPcList(result.ok),
            failed: uiPcLabel(result.failed[0].name),
            msg: result.failed[0].err,
          }),
        );
      }
      if (result.ok.length) {
        void patchAppPreferences({
          lastBookingClubId: cafe!.icafe_id,
          favoriteClubId: cafe!.icafe_id,
          lastBookingDateISO: dateStart,
          ...(tariff ? { lastTariff: tariffToSaved(tariff) } : {}),
        });
        if (!partial) {
          const pcLine = uiPcList(result.ok);
          const successBody = pcLine.includes(',')
            ? t('booking.successTextMany', { pcs: pcLine })
            : result.ok.length > 1
              ? `${t('booking.successText')} ${t('booking.successParty', { n: result.ok.length })}`
              : t('booking.successText');
          showAlert(t('booking.successTitle'), successBody, [
            {
              text: t('booking.addToCalendar'),
              style: 'cancel',
              onPress: () => {
                void onAddBookingToCalendar(pcLine);
              },
            },
            { text: t('booking.successOk'), style: 'default' },
          ]);
        }
        try {
          const prefs = await loadAppPreferences();
          const bookedPartyCount = result.ok.length;
          const partySuffix = bookedPartyCount > 1 ? t('notif.partySuffix', { n: bookedPartyCount }) : '';
          const when = `${dateStart} ${formatMoscowWallSlotForLocale(dateStart, timeStart, locale === 'en' ? 'en' : 'ru')}`;
          const reminderVars = {
            club: uiClubLabel(cafe!.address),
            pc: uiPcList(result.ok),
            when,
            party: partySuffix,
            h: prefs.prepDepartHoursBefore,
          };
          const baseBody = t('notif.reminderBody', reminderVars);
          await scheduleBookingRemindersFromPrefs(
            prefs,
            dateStart,
            timeStart,
            {
              reminderTitle: t('notif.reminderTitle'),
              reminderBody: baseBody,
              startTitle: t('notif.startTitle'),
              startBody: t('notif.startBody', reminderVars),
              offsetBody: (n) => t('notif.offsetBody', { body: baseBody, n }),
              prepTitle: t('notif.prepTitle'),
              prepBody: t('notif.prepBody', reminderVars),
            },
            t('notif.androidChannelReminders'),
            {
              durationMins: minsNum,
              icafeId: cafe!.icafe_id,
              followUpMessages: {
                visitTitle: t('notif.visitFeedbackTitle'),
                visitBody: t('notif.visitFeedbackBody', reminderVars),
              },
            },
          );
        } catch {
          /* напоминания — дополнение; сбой expo-notifications не должен скрывать факт успешной брони */
        }
        try {
          await refreshMemberBalance();
        } catch {
          /* баланс уже отобразится из текущего session cache; синк с backend — best effort */
        }
      }
      setSelectedPcs([]);
      refreshCachesAfterBooking();
    },
    onError: (e: unknown) => {
      const msg = formatPublicErrorMessage(e, t, 'booking.errorGeneric');
      showAlert(t('booking.alertBooking'), msg);
    },
  });

  const cafesAll = cafesQ.data ?? [];
  const pickerCities = useMemo(() => orderedCitiesForPicker(cafesAll), [cafesAll]);
  const pendingPickerCityId =
    pickerCities[Math.max(0, Math.min(pickerCities.length - 1, pendingCityIdx))]?.id ?? DEFAULT_CITY_ID;
  const clubsInPendingCity = useMemo(
    () => cafesInCity(cafesAll, pendingPickerCityId),
    [cafesAll, pendingPickerCityId],
  );
  const cafes = cafesAll;

  const cityWheelLabels = useMemo(
    () => pickerCities.map((c) => (locale === 'en' ? c.nameEn : c.nameRu)),
    [pickerCities, locale],
  );
  const clubWheelLabels = useMemo(() => {
    const cityIndex = Math.max(0, Math.min(pickerCities.length - 1, pendingCityIdx));
    const cityId = pickerCities[cityIndex]?.id;
    const cityDef = cityId ? getCityDefinition(cityId) : undefined;
    const selectedCityLabel = cityWheelLabels[cityIndex] ?? '';
    const cityNames = [cityDef?.nameRu ?? '', cityDef?.nameEn ?? '', selectedCityLabel];
    return clubsInPendingCity.map((c) => stripCityPrefixFromAddress(c.address ?? '', cityNames));
  }, [pickerCities, pendingCityIdx, clubsInPendingCity, cityWheelLabels]);

  const openClubPicker = useCallback(() => {
    if (pickerCities.length === 0) {
      setPendingCityIdx(0);
      setPendingClubIdx(0);
      pendingCityIdxRef.current = 0;
      pendingClubIdxRef.current = 0;
      setModalClub(true);
      return;
    }
    let cityIdx = 0;
    if (cafe) {
      const inferred = inferCityIdFromCafe(cafe);
      if (inferred) {
        const idx = pickerCities.findIndex((c) => c.id === inferred);
        if (idx >= 0) cityIdx = idx;
      }
    }
    const cityId = pickerCities[cityIdx]?.id ?? DEFAULT_CITY_ID;
    const pool = cafesInCity(cafesAll, cityId);
    let clubIdx = cafe ? pool.findIndex((x) => x.icafe_id === cafe.icafe_id) : 0;
    if (clubIdx < 0) clubIdx = 0;
    setPendingCityIdx(cityIdx);
    setPendingClubIdx(clubIdx);
    pendingCityIdxRef.current = cityIdx;
    pendingClubIdxRef.current = clubIdx;
    setModalClub(true);
  }, [cafe, cafesAll, pickerCities]);

  const costLabel = tariffCostLabel(tariff);
  const totalPriceRub = useMemo(() => {
    const selectedPartySize = selectedPcs.length > 0 ? selectedPcs.length : 1;
    if (!tariff) return NaN;
    if (!Number.isFinite(minsNum) || minsNum <= 0) return NaN;
    if (selectedPcs.length > 0) {
      return totalBookingRub(tariff, selectedPcs, pricesList, products, minsNum);
    }
    if (tariff.kind === 'product') {
      const flat = productPackagePriceRub(tariff);
      return Number.isFinite(flat) ? flat * selectedPartySize : NaN;
    }
    if (tariff.kind === 'price') {
      if (shouldChargeViaCatalogProducts(products, minsNum)) {
        return NaN;
      }
      if (isHourlyGridDurationMins(minsNum)) {
        const rub = priceBookingRubForResolvedTier(pricesList, tariff.item, minsNum);
        return Number.isFinite(rub) ? rub * selectedPartySize : NaN;
      }
    }
    return NaN;
  }, [tariff, selectedPcs, pricesList, products, minsNum]);

  const allSelectedPcsHaveTariff =
    !tariff ||
    selectedPcs.length === 0 ||
    selectedPcs.every((pc) => resolveTariffForPc(tariff, pc, pricesList, products) != null);

  const hourlyZoneRubRange = useMemo(() => {
    if (tariff?.kind !== 'price' || !pricesList.length) return null;
    return hourlyRubPerHourRangeForSession(pricesList, minsNum);
  }, [tariff, pricesList, minsNum]);

  const payLabel =
    Number.isFinite(totalPriceRub) && totalPriceRub > 0 ? totalPriceRub.toFixed(2) : costLabel;

  const bookingSelectionReady = selectedPcs.length > 0;
  const bookingLine1 = t('booking.bookingLine1Short');

  const showHourlyZoneRange =
    tariff?.kind === 'price' &&
    !!hourlyZoneRubRange &&
    hourlyZoneRubRange.max > hourlyZoneRubRange.min &&
    selectedPcs.length === 0;

  const bookingLine2 =
    bookingSelectionReady && tariff && costLabel !== '—'
      ? showHourlyZoneRange
        ? t('booking.bookingLine2HourlyZones', {
            min: Math.round(hourlyZoneRubRange!.min),
            max: Math.round(hourlyZoneRubRange!.max),
          })
        : t('booking.bookingLine2Pay', { price: payLabel })
      : '';

  const canBook =
    dateFilterCommitted &&
    timeAndDurationReady &&
    pcTierFilterReady &&
    selectedPcs.length > 0 &&
    !!planIv &&
    selectedPcs.every((p) => !effectivePcBusyForPlan(p, planIv, bookingNowMs)) &&
    selectedPcs.every(
      (p) => !planOverlapBusyPcsLower.has(String(p.pc_name).trim().toLowerCase()),
    ) &&
    allSelectedPcsHaveTariff &&
    memberIdNumericOk &&
    signHintOk &&
    !bookMut.isPending &&
    !!cafe &&
    !cafeBookingsOverlapLoading &&
    !overlapWithExistingBookings &&
    !accountOverlapBooking;

  /** Поиск ближайшего окна: клуб, длительность/тариф и тип ПК подтверждены; прайс клуба загружен. */
  const canRunNearestSearch =
    memberProfileReady &&
    !!cafe &&
    timeAndDurationReady &&
    nearestSearchZoneReady &&
    Number.isFinite(minsNum) &&
    minsNum > 0 &&
    !pricesQ.isLoading &&
    !nearestSlotsMut.isPending;

  const balance = user?.balanceRub;
  const needPay =
    balance !== undefined &&
    tariff != null &&
    Number.isFinite(totalPriceRub) &&
    totalPriceRub > balance;

  const onMainBookingPress = () => {
    if (!canBook) return;
    if (!signHintOk) {
      showAlert(t('booking.signTitle'), t('booking.signBody'));
      return;
    }
    if (needPay) {
      showAlert(t('booking.lowBalanceTitle'), t('booking.lowBalanceBody'), [
        { text: t('booking.cancel'), style: 'cancel' },
        { text: t('booking.topUp'), onPress: () => Linking.openURL(topUpUrl) },
      ]);
      return;
    }
    bookMut.mutate();
  };

  const timeRowValue = t('booking.timeRowValue', {
    time: formatMoscowWallSlotForLocale(dateStart, timeStart, locale === 'en' ? 'en' : 'ru'),
  });
  const timeDurationFilterSubtitleMain = useMemo(
    () =>
      timeAndDurationReady
        ? buildTimeDurationFilterSubtitle(
            styles,
            t,
            locale,
            formatMoscowWallSlotForLocale(dateStart, timeStart, locale === 'en' ? 'en' : 'ru'),
            tariff,
            minsNum,
            pricesList,
            products,
            effectivePackageZone,
            showSavingBenefit,
          )
        : '',
    [
      timeAndDurationReady,
      styles,
      t,
      locale,
      dateStart,
      timeStart,
      tariff,
      minsNum,
      pricesList,
      products,
      effectivePackageZone,
      showSavingBenefit,
    ],
  );

  const timeDurationFilterSubtitleNearest = useMemo(
    () =>
      timeAndDurationReady
        ? buildTimeDurationFilterSubtitle(
            styles,
            t,
            locale,
            nearestSearchTimeAny
              ? t('booking.nearestAny')
              : formatMoscowWallSlotForLocale(effectiveDateForTimeSlots, timeStart, locale === 'en' ? 'en' : 'ru'),
            tariff,
            minsNum,
            pricesList,
            products,
            effectivePackageZone,
            showSavingBenefit,
          )
        : '',
    [
      timeAndDurationReady,
      styles,
      t,
      locale,
      nearestSearchTimeAny,
      effectiveDateForTimeSlots,
      timeStart,
      tariff,
      minsNum,
      pricesList,
      products,
      effectivePackageZone,
      showSavingBenefit,
    ],
  );

  const timeSlotLabels = useMemo(
    () =>
      timeSlots.map((s) =>
        formatMoscowWallSlotForLocale(effectiveDateForTimeSlots, s, locale === 'en' ? 'en' : 'ru'),
      ),
    [timeSlots, effectiveDateForTimeSlots, locale],
  );
  const mainTimeSlotLabels = useMemo(
    () =>
      mainTimeSlots.map((s) =>
        formatMoscowWallSlotForLocale(dateStart, s, locale === 'en' ? 'en' : 'ru'),
      ),
    [mainTimeSlots, dateStart, locale],
  );

  const timeLabelsForDurationModal = useMemo(
    () =>
      timeModalForNearestSlotSearch
        ? [t('booking.nearestAny'), ...timeSlotLabels]
        : mainTimeSlotLabels,
    [timeModalForNearestSlotSearch, timeSlotLabels, mainTimeSlotLabels, t],
  );

  const dateListLabels = useMemo(
    () => datesList.map((iso) => formatMoscowCalendarDayLong(iso, locale === 'en' ? 'en' : 'ru')),
    [datesList, locale],
  );

  const nearestSearchDayLabels = useMemo(
    () => [t('booking.nearestAny'), ...dateListLabels],
    [t, dateListLabels],
  );

  const resolvedDurationWheelIndex = useMemo(() => {
    if (!durationWheelEntries.length) return 0;
    if (!tariff) return 0;
    if (tariff.kind === 'price') {
      const i = durationPresetMinsList.indexOf(minsNum);
      if (i >= 0) return Math.min(i, durationWheelEntries.length - 1);
    }
    if (tariff.kind === 'product') {
      const off = durationPresetMinsList.length;
      const tm = catalogProductSessionMins(tariff.item);
      const j = catalogSessionPackageProducts.findIndex((p) => {
        const sameRow =
          p.product_id === tariff.item.product_id &&
          String(p.group_name ?? '') === String(tariff.item.group_name ?? '');
        const sameDuration = tm != null && catalogProductSessionMins(p) === tm;
        return sameRow || sameDuration;
      });
      if (j >= 0) {
        const idx = off + j;
        return Math.min(idx, durationWheelEntries.length - 1);
      }
    }
    return 0;
  }, [tariff, minsNum, durationWheelEntries, durationPresetMinsList, catalogSessionPackageProducts]);

  const resolvedZoneWheelIndex = useMemo(
    () => Math.max(0, ZONE_WHEEL_KEYS.indexOf(nearestSearchPcZone)),
    [nearestSearchPcZone],
  );

  const suggestedTimeIdx = useMemo(
    () =>
      defaultTimeSlotWheelIndex(
        timeSlots,
        effectiveDateForTimeSlots,
        bookingNowMs,
        slotStep,
        nearestSearchFullDayTimeGrid,
      ),
    [timeSlots, effectiveDateForTimeSlots, bookingNowMs, slotStep, nearestSearchFullDayTimeGrid],
  );
  const mainSuggestedTimeIdx = useMemo(
    () => defaultTimeSlotWheelIndex(mainTimeSlots, dateStart, bookingNowMs, slotStep, false),
    [mainTimeSlots, dateStart, bookingNowMs, slotStep],
  );

  const occupancyDaysStrip = useMemo(() => {
    const out: string[] = [];
    let day = formatISODateMoscow(new Date(bookingNowMs));
    for (let i = 0; i < 14; i++) {
      out.push(day);
      day = addCalendarDaysMoscow(day, 1);
    }
    return out;
  }, [bookingNowMs]);

  const occupancyRowsForSelectedPcs = useMemo(() => {
    if (!cafe || !selectedPcs.length) return [];
    return cafeBookingRowsForOverlap.filter((r) =>
      selectedPcs.some((p) => pcNamesLooselyEqual(p.pc_name, r.product_pc_name)),
    );
  }, [cafe, selectedPcs, cafeBookingRowsForOverlap]);

  const occupancyRowsDisplayed = useMemo(() => {
    if (!cafe) return [];
    if (occupancyFilterDay === null) {
      const future = occupancyRowsForSelectedPcs.filter(
        (r) => bookingRowLifecycleStatus(r, bookingNowMs) !== 'ended',
      );
      return sortMemberBookingRows(future, bookingNowMs);
    }
    return occupancyRowsForSelectedPcs
      .filter((r) => {
        const iv = intervalFromMemberRow(r);
        return iv && intervalTouchesCalendarDay(iv, occupancyFilterDay);
      })
      .sort((a, b) => {
        const ia = intervalFromMemberRow(a);
        const ib = intervalFromMemberRow(b);
        return (ia?.start.getTime() ?? 0) - (ib?.start.getTime() ?? 0);
      });
  }, [cafe, occupancyRowsForSelectedPcs, occupancyFilterDay, bookingNowMs]);

  useEffect(() => {
    if (modalOccupancy) setOccupancyFilterDay(null);
  }, [modalOccupancy]);

  const applyClubWheelSelection = (cityIndex: number, clubIndex: number) => {
    const cLen = pickerCities.length;
    const cityDef = pickerCities[cLen <= 0 ? 0 : Math.max(0, Math.min(cLen - 1, cityIndex))];
    if (!cityDef) {
      setModalClub(false);
      return;
    }
    const pool = cafesInCity(cafesAll, cityDef.id);
    const item = pool[Math.max(0, Math.min(pool.length - 1, clubIndex))];
    if (item) {
      setCafe(item);
      setSelectedPcs([]);
      void patchAppPreferences({ favoriteClubId: item.icafe_id });
      const today = formatISODateMoscow(new Date(bookingNowMs));
      setDateStart(today);
      setDateFilterCommitted(false);
      setTimeDurationFilterCommitted(false);
      setNearestSearchPcZone('any');
      setNearestSearchPcZoneCommitted(false);
      setTimeStart(buildBookingTimeSlots(today, timeSlotOptions)[0] ?? '12:00');
      setTariff(null);
      setPriceName('');
    }
    setModalClub(false);
  };

  const applyDateWheelSelection = (idx: number) => {
    const iso = datesList[idx];
    if (iso) setDateStart(iso);
    setDateFilterCommitted(true);
    setModalDate(false);
  };

  const applyNearestDayWheelSelection = (idx: number) => {
    if (idx <= 0) setNearestSearchDayISO(null);
    else {
      const iso = datesList[idx - 1];
      if (iso) setNearestSearchDayISO(iso);
    }
    setModalNearestDay(false);
  };

  const closeTimeDurationModal = useCallback(() => {
    setModalTimeDuration(false);
    timeModalNearestSearchRef.current = false;
    setTimeModalForNearestSlotSearch(false);
  }, []);

  const applyTimeDurationWheelSelection = (ti: number, di: number) => {
    void (async () => {
      const forNearest = timeModalNearestSearchRef.current;
      const slots = forNearest ? timeSlotsRef.current : mainTimeSlotsRef.current;
      const entries = durationWheelEntriesRef.current;
      const nTime = slots.length;
      const nDur = entries.length;
      if (!cafe) return;
      if (!nTime || !nDur) {
        showAlert(t('booking.alertBooking'), t('booking.errorGeneric'));
        return;
      }
      let tiSafe: number;
      /** Первый пункт колеса в шторке поиска окон — «Без разницы» по времени; не путать с реальным слотом tiSafe. */
      let nearestTimeAnyForApply = false;
      if (forNearest) {
        const sug = defaultTimeSlotWheelIndex(
          slots,
          effectiveDateForTimeSlotsRef.current,
          bookingNowMs,
          slotStep,
          nearestSearchFullDayTimeGridRef.current,
        );
        if (ti <= 0) {
          setNearestSearchTimeAny(true);
          nearestTimeAnyForApply = true;
          tiSafe = Math.max(0, Math.min(nTime - 1, sug));
        } else {
          setNearestSearchTimeAny(false);
          tiSafe = Math.max(0, Math.min(nTime - 1, ti - 1));
        }
      } else {
        tiSafe = Math.max(0, Math.min(nTime - 1, Number.isFinite(ti) ? Math.trunc(ti) : 0));
      }
      const diSafe = Math.max(0, Math.min(nDur - 1, Number.isFinite(di) ? Math.trunc(di) : 0));
      let slot = slots[tiSafe];
      let entry = entries[diSafe];
      if (!slot || !entry) {
        showAlert(t('booking.alertBooking'), t('booking.errorGeneric'));
        return;
      }

      const dayForSlot = forNearest
        ? effectiveDateForTimeSlotsRef.current
        : mainFormDateForSlotsRef.current;

      if (!forNearest) {
        setDateStart(dayForSlot);
        setDateFilterCommitted(true);
      } else {
        const lockedNearestDay = nearestSearchDayISORef.current;
        if (lockedNearestDay) {
          setDateStart(lockedNearestDay);
          setDateFilterCommitted(true);
        }
      }

      const minsForPricesKey =
        entry.kind === 'preset' ? entry.mins : bookingPackageWheelDisplayMins(entry.product, minsNum);

      let prices = pricesListRef.current;
      /** Пока `refetch()` после открытия шторки не вернул данные, почасовой пресет нельзя сопоставить — ждём прайс. */
      if (entry.kind === 'preset' && prices.length === 0) {
        try {
          const data = await qc.fetchQuery({
            queryKey: queryKeys.allPrices({
              cafeId: cafe.icafe_id,
              memberId: user?.memberId,
              mins: minsForPricesKey,
              bookingDate: dayForSlot,
            }),
            queryFn: () =>
              bookingFlowApi.allPrices({
                cafeId: cafe.icafe_id,
                memberId: user?.memberId,
                mins: minsForPricesKey,
                bookingDate: dayForSlot,
              }),
          });
          prices = data?.prices ?? [];
        } catch {
          showAlert(t('booking.alertBooking'), t('booking.errorGeneric'));
          return;
        }
      }

      /** После `await` замыкание могло устареть — снова читаем слот и строку колеса. */
      entry = durationWheelEntriesRef.current[diSafe];
      slot = (forNearest ? timeSlotsRef.current : mainTimeSlotsRef.current)[tiSafe];
      if (!slot || !entry) {
        showAlert(t('booking.alertBooking'), t('booking.errorGeneric'));
        return;
      }

      if (entry.kind === 'preset') {
        const tpl = pickHourlyTemplateForSessionMins(prices, entry.mins);
        if (!tpl) {
          showAlert(t('booking.alertBooking'), t('booking.noHourlyTier'));
          return;
        }
        const next = matchPriceTierToMinutes(prices, tpl, entry.mins);
        setTariff({ kind: 'price', item: next });
        setPriceName(next.price_name);
        setMins(String(entry.mins));
      } else {
        try {
          const next: TariffChoice = { kind: 'product', item: entry.product };
          setTariff(next);
          setPriceName('');
          setMins(String(bookingPackageWheelDisplayMins(entry.product, minsNum)));
        } catch (e) {
          console.warn('booking package select', e);
          showAlert(t('booking.alertBooking'), t('booking.errorGeneric'));
          return;
        }
      }

      if (!nearestTimeAnyForApply) {
        setTimeStart(slot);
      }
      setTimeDurationFilterCommitted(true);
      closeTimeDurationModal();
    })();
  };

  const applyTimeDurationSelectionFromWheels = useCallback(
    (overrides?: { timeIndex?: number; durationIndex?: number }) => {
      /**
       * Один и тот же путь для кнопки «Готово» и тапа по строке:
       * читаем текущие центры колёс, при необходимости подменяем индекс на явно нажатый.
       */
      const nT = timeLabelsForDurationModal.length;
      const nD = durationWheelItems.length;
      const tiRaw =
        overrides?.timeIndex
        ?? timeWheelRef.current?.getCenterIndex()
        ?? pendingTimeIdxRef.current;
      const diRaw =
        overrides?.durationIndex
        ?? durWheelRef.current?.getCenterIndex()
        ?? pendingDurIdxRef.current;
      const ti = nT <= 0 ? 0 : Math.max(0, Math.min(nT - 1, tiRaw));
      const di = nD <= 0 ? 0 : Math.max(0, Math.min(nD - 1, diRaw));
      applyTimeDurationWheelSelection(ti, di);
    },
    [
      applyTimeDurationWheelSelection,
      durationWheelItems.length,
      timeLabelsForDurationModal.length,
    ],
  );

  const applyZoneWheelSelection = (idx: number) => {
    const k = ZONE_WHEEL_KEYS[Math.max(0, Math.min(ZONE_WHEEL_KEYS.length - 1, idx))];
    setNearestSearchPcZone(k);
    setNearestSearchPcZoneCommitted(true);
    setModalTariff(false);
  };

  const renderSeatViewToggle = (variant: 'default' | 'nearest') => (
    <View
      style={[styles.seatViewToggleRow, variant === 'nearest' && styles.seatViewToggleRowNearest]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.seatViewToggleBtn,
          seatLayoutMode === 'scheme' && styles.seatViewToggleBtnActive,
          pressed && styles.pressed,
        ]}
        onPress={() => setSeatLayoutMode('scheme')}
      >
        <Text
          style={[
            styles.seatViewToggleText,
            seatLayoutMode === 'scheme' && styles.seatViewToggleTextActive,
          ]}
        >
          {t('booking.seatViewScheme')}
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.seatViewToggleBtn,
          seatLayoutMode === 'list' && styles.seatViewToggleBtnActive,
          pressed && styles.pressed,
        ]}
        onPress={() => setSeatLayoutMode('list')}
      >
        <Text
          style={[
            styles.seatViewToggleText,
            seatLayoutMode === 'list' && styles.seatViewToggleTextActive,
          ]}
        >
          {t('booking.seatViewList')}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.bookingMainColumn}>
        <ScrollView
          style={styles.bookingScrollFlex}
          contentContainerStyle={[
            styles.scroll,
            cafe ? { flexGrow: 1 } : null,
            compactVertical ? { paddingTop: 0, paddingBottom: 10 } : null,
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={Platform.OS === 'android'}
          scrollEnabled={mainScrollContentH > mainScrollViewportH + 2}
          showsVerticalScrollIndicator={mainScrollContentH > mainScrollViewportH + 2}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          onLayout={(e) => setMainScrollViewportH(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setMainScrollContentH(h)}
        >
        <View style={styles.topBarLift}>
          <TabScreenTopBar
            title={t('tabs.booking')}
            dense={compactVertical}
            horizontalPadding={0}
          />
        </View>

        <TodaysBookingBanner />

        {!memberProfileReady ? <Text style={styles.warn}>{t('booking.warnNoMemberId')}</Text> : null}
        {memberProfileReady && !memberIdNumericOk ? (
          <Text style={styles.warn}>{t('booking.warnMemberIdFormat')}</Text>
        ) : null}
        {memberProfileReady && memberIdNumericOk && !signHintOk ? (
          <Text style={styles.warn}>{t('booking.warnSign')}</Text>
        ) : null}

        <BookingWheelFilterRow
          styles={styles}
          colors={colors}
          icon="map-marker-outline"
          emptyHint={t('booking.filterSelectClub')}
          titleFilled={t('booking.filterTitleClub')}
          subtitle={cafe?.address ?? ''}
          hasValue={!!cafe}
          disabled={false}
          onPress={openClubPicker}
        />

        {cafe && sessionQ.data?.active && sessionQ.data.pcName ? (
          <View style={styles.sessionBanner}>
            <MaterialCommunityIcons name="monitor-dashboard" size={22} color={colors.accentBright} />
            <Text style={styles.sessionBannerText}>
              {t('booking.sessionOnPc', {
                pc: uiPcLabel(sessionQ.data.pcName),
                detail: sessionQ.data.detailLabel
                  ? t('booking.sessionOnPcDetail', { t: sessionQ.data.detailLabel })
                  : '',
              })}
            </Text>
          </View>
        ) : null}

        <BookingWheelFilterRow
          styles={styles}
          colors={colors}
          icon="calendar-month-outline"
          emptyHint={t('booking.filterSelectDate')}
          titleFilled={t('booking.filterTitleDate')}
          subtitle={formatDateHuman(dateStart)}
          hasValue={dateFilterCommitted}
          disabled={!cafe}
          onPress={() => {
            if (!cafe) return;
            const nextDateIdx = wheelIndexForCalendarIso(dateStart, datesList);
            setPendingDateIdx(nextDateIdx);
            pendingDateIdxRef.current = nextDateIdx;
            setModalDate(true);
          }}
        />
        <BookingWheelFilterRow
          styles={styles}
          colors={colors}
          icon="clock-outline"
          emptyHint={t('booking.filterSelectTimeDuration')}
          titleFilled={t('booking.filterTitleTime')}
          subtitle={
            timeAndDurationReady ? timeDurationFilterSubtitleMain : ''
          }
          hasValue={timeAndDurationReady}
          disabled={!cafe || !dateFilterCommitted}
          onPress={() => {
            if (!cafe || !dateFilterCommitted) return;
            timeModalNearestSearchRef.current = false;
            setTimeModalForNearestSlotSearch(false);
            const rawTi = mainTimeSlots.indexOf(timeStart);
            const ti = !timeAndDurationReady
              ? mainSuggestedTimeIdx
              : rawTi >= 0
                ? rawTi
                : mainSuggestedTimeIdx;
            setPendingTimeIdx(ti);
            setPendingDurIdx(resolvedDurationWheelIndex);
            pendingTimeIdxRef.current = ti;
            pendingDurIdxRef.current = resolvedDurationWheelIndex;
            setModalTimeDuration(true);
          }}
        />

        {memberProfileReady ? (
          <Pressable
            style={({ pressed }) => [styles.btnGlobalSearch, pressed && styles.pressed]}
            onPress={() => {
              setNearestSlotResults([]);
              setNearestSearchTargetPcs([]);
              setNearestMenuPhase('form');
              setModalNearestMenu(true);
            }}
            disabled={nearestSlotsMut.isPending}
          >
            <Text style={styles.btnGlobalSearchText}>{t('booking.nearestNearestInClub')}</Text>
          </Pressable>
        ) : null}

        {cafe ? (
          <View key={`map-${cafe.icafe_id}`} style={{ flex: 1, minHeight: compactVertical ? 120 : 140 }}>
            {renderSeatViewToggle('default')}
            <View style={{ flex: 1, minHeight: 100 }}>
              {seatLayoutMode === 'scheme' ? (
                <View style={{ flex: 1, minHeight: 0 }}>
                  <View
                    style={[
                      styles.mapBlock,
                      styles.mapBlockScheme,
                      !canSelectPc && structQ.data?.rooms?.length ? { overflow: 'visible' } : null,
                    ]}
                  >
                    {structQ.isError ? (
                      <QueryError
                        message={formatPublicErrorMessage(structQ.error, t, 'booking.errorGeneric')}
                        onRetry={() => void structQ.refetch()}
                        t={t}
                        styles={styles}
                        colors={colors}
                      />
                    ) : structQ.isLoading || (structQ.isFetching && !structQ.data) ? (
                      <ClubDataLoader message={t('common.loader.captionPc')} compact minHeight={240} />
                    ) : structQ.data?.rooms?.length ? (
                      <>
                        <MemoClubLayoutCanvas
                          rooms={structQ.data.rooms}
                          colors={colors}
                          icafeId={cafe.icafe_id}
                          zoneFilter={bookingMapZoneFilter}
                          pcAvailability={pcAvailability}
                          onPcPress={onMapPcPress}
                          minHeight={hallMapMinHeight}
                          horizontalPadding={scrollHPad * 2}
                          bookingCompact
                          dimContent={!canSelectPc}
                        />
                        {!canSelectPc ? (
                          <Pressable
                            onPress={alertSelectPcBlockedIfNeeded}
                            accessibilityLabel={pcSelectionLockHint}
                            style={{
                              position: 'absolute',
                              zIndex: 10,
                              top: 0,
                              bottom: 0,
                              left: -scrollHPad,
                              width: windowWidth,
                              backgroundColor: 'rgba(0,0,0,0)',
                            }}
                          />
                        ) : null}
                      </>
                    ) : (
                      <Text style={styles.hintMuted}>{t('hallMap.emptyZones')}</Text>
                    )}
                  </View>
                  {hallMapCanonicalLayout ? (
                    <HallMapStatusLegend variant="booking" />
                  ) : (
                    <View style={styles.legend}>
                      <LegendDot styles={styles} color={colors.pcBusy} label={t('hallMap.legendBusy')} />
                      <LegendDot styles={styles} color={colors.pcSelected} label={t('hallMap.legendSelected')} />
                      <LegendDot
                        styles={styles}
                        color={colors.pcFree}
                        label={t('booking.legendFree')}
                        hollow
                      />
                      <LegendDot
                        styles={styles}
                        color={colors.pcUnavailable}
                        label={t('hallMap.legendUnavailable')}
                      />
                    </View>
                  )}
                  {structQ.data?.rooms?.length && selectedPcs.length > 0 ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.occupancyBtn,
                        styles.mapOccupancyBtn,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setModalOccupancy(true)}
                    >
                      <Text style={styles.occupancyBtnText}>{t('booking.occupancy')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <View
                    style={[
                      styles.mapBlock,
                      { flex: 1, minHeight: 0 },
                    ]}
                  >
                    <FlatList
                      data={pcListRows}
                      renderItem={renderPcListRow}
                      keyExtractor={(item) => item.key}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      style={{ flex: 1, minHeight: 0 }}
                      contentContainerStyle={{ paddingBottom: 4 }}
                      showsVerticalScrollIndicator
                      removeClippedSubviews={Platform.OS !== 'web'}
                      initialNumToRender={10}
                      windowSize={9}
                      maxToRenderPerBatch={10}
                      updateCellsBatchingPeriod={16}
                    />
                    {selectedPcs.length > 0 ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.occupancyBtn,
                          styles.mapOccupancyBtn,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => setModalOccupancy(true)}
                      >
                        <Text style={styles.occupancyBtnText}>{t('booking.occupancy')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {overlapWithExistingBookings && overlapConflict ? (
          <View style={styles.overlapBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} />
            <Text style={styles.overlapBannerText}>{t('booking.cannotBookSeatOverlap')}</Text>
          </View>
        ) : null}

        {seatLayoutMode === 'list'
          ? pcsQuery.isFetching && !pcsQuery.data
            ? <ClubDataLoader message={t('common.loader.captionPc')} compact minHeight={200} style={{ marginBottom: 12 }} />
            : pcsQuery.isError && !pcsQuery.data
              ? (
                <QueryError
                  message={formatPublicErrorMessage(pcsQuery.error, t, 'booking.errorGeneric')}
                  onRetry={() => pcsQuery.refetch()}
                  t={t}
                  styles={styles}
                  colors={colors}
                />
              )
              : null
          : null}

        {tariff && selectedPcs.length > 0 && !allSelectedPcsHaveTariff ? (
          <Text style={styles.hintWarn}>{t('booking.zoneTariffHint')}</Text>
        ) : null}

        {!pcs && !pcsQuery.isFetching && cafe && memberProfileReady ? (
          <Text style={styles.hintMuted}>{t('booking.noPcsYet')}</Text>
        ) : null}
        </ScrollView>

        <View
          style={[
            styles.bookingFooter,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <View style={styles.bottomActions}>
            <Pressable
              style={({ pressed }) => [
                styles.btnGrey,
                hasMemberBookingHistory && styles.btnMyBookingsHasHistory,
                pressed && styles.pressed,
              ]}
              onPress={() => setModalBooks(true)}
            >
              <View style={styles.btnMyBookingsRow}>
                <Text
                  style={[
                    styles.btnGreyText,
                    hasMemberBookingHistory && styles.btnMyBookingsHasHistoryText,
                  ]}
                >
                  {t('booking.myBookings')}
                </Text>
              </View>
              {myBookingsListCount > 0 ? (
                <View style={styles.myBookingsCountBadge}>
                  <Text style={styles.myBookingsCountBadgeText}>
                    {myBookingsListCount > 99 ? '99+' : String(myBookingsListCount)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            {bookPrimaryBlockReason != null ? (
              <View style={styles.bookPrimaryBlocked}>
                <Text
                  style={
                    bookPrimaryBlockReason === 'seat_overlap' ? styles.bookPrimaryBlockedTextWarn : styles.bookPrimaryBlockedText
                  }
                >
                  {bookPrimaryBlockReason === 'own_overlap'
                    ? t('booking.cannotBookOwnOverlap')
                    : t('booking.cannotBookSeatOverlap')}
                </Text>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimary,
                  !canBook && styles.btnPrimaryDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={onMainBookingPress}
                disabled={!canBook}
              >
                <Text style={styles.btnPrimaryLine1}>{bookingLine1}</Text>
                {bookingLine2 ? <Text style={styles.btnPrimaryLine2}>{bookingLine2}</Text> : null}
              </Pressable>
            )}
          </View>

          <Pressable
            style={styles.termsLink}
            onPress={() => {
              void pricesQ.refetch();
              setModalTermsPrices(true);
            }}
          >
            <Text style={styles.termsLinkText}>{t('booking.terms')}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={modalNearestMenu}
        animationType="fade"
        onRequestClose={() => {
          nearestSearchAbortRef.current?.abort();
          setModalNearestMenu(false);
          setNearestMenuPhase('form');
          setNearestSearchTargetPcs([]);
        }}
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
      >
        <View style={[styles.nearestScreenRoot, { backgroundColor: colors.bg }]}>
          <SafeAreaView style={styles.nearestScreenSafe} edges={['top', 'right', 'left', 'bottom']}>
            {nearestMenuPhase === 'results' ? (
              <>
                <View style={styles.nearestResultsHeaderRow}>
                  <Pressable
                    style={({ pressed }) => [styles.nearestResultsBackBtn, pressed && styles.pressed]}
                    onPress={() => {
                      setNearestMenuPhase('form');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('booking.nearestBackToSearch')}
                  >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                  </Pressable>
                  <Text style={styles.nearestResultsTitle}>{t('booking.nearestResultsTitle')}</Text>
                  <Pressable
                    onPress={() => {
                      nearestSearchAbortRef.current?.abort();
                      setModalNearestMenu(false);
                      setNearestMenuPhase('form');
                      setNearestSearchTargetPcs([]);
                    }}
                    style={({ pressed }) => [styles.nearestScreenCloseBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={t('booking.close')}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                  </Pressable>
                </View>
                {cafe ? <Text style={styles.nearestSheetClubLine}>{cafe.address}</Text> : null}
                {nearestSlotResults.length === 0 ? (
                  <Text style={styles.nearestMenuEmpty}>{t('booking.nearestNoSlots')}</Text>
                ) : (
                  <ScrollView style={styles.modalScrollFlex} keyboardShouldPersistTaps="handled">
                    {nearestSlotResults.map((c, idx) => {
                      const key = nearestCandidateKey(c);
                      const details = describeNearestSlotCandidate(c);
                      return (
                        <View key={`${key}-${idx}`} style={styles.nearestResultCard}>
                          <Text style={styles.nearestResultTitle}>{details.whenLabel}</Text>
                          <Text style={styles.nearestResultMeta}>
                            {t('booking.nearestDetailsDuration', { duration: details.durationLabel })}
                          </Text>
                          {details.serverFrame ? (
                            <Text style={styles.nearestResultMeta}>
                              {t('booking.nearestDetailsFrame', { tf: details.serverFrame })}
                            </Text>
                          ) : null}
                          <View style={styles.nearestResultActions}>
                            <Pressable
                              style={({ pressed }) => [styles.nearestResultBtnPrimary, pressed && styles.pressed]}
                              onPress={() => applyNearestSlotCandidate(c)}
                            >
                              <Text style={styles.nearestResultBtnPrimaryText}>{t('booking.nearestBookSlot')}</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <View style={styles.nearestScreenHeaderRow}>
                  <View style={styles.nearestHeaderCloseSpacer} />
                  <Text style={styles.nearestResultsTitle}>{t('booking.findNearestWindow')}</Text>
                  <Pressable
                    onPress={() => {
                      nearestSearchAbortRef.current?.abort();
                      setModalNearestMenu(false);
                      setNearestMenuPhase('form');
                      setNearestSearchTargetPcs([]);
                    }}
                    style={({ pressed }) => [styles.nearestScreenCloseBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={t('booking.close')}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                  </Pressable>
                </View>
                {t('booking.nearestMenuHint').trim() ? (
                  <Text style={styles.nearestMenuHint}>{t('booking.nearestMenuHint')}</Text>
                ) : null}
                <ScrollView
                  style={styles.modalScrollFlex}
                  contentContainerStyle={styles.nearestMenuScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                <BookingWheelFilterRow
                  styles={styles}
                  colors={colors}
                  icon="map-marker-outline"
                  emptyHint={t('booking.filterSelectClub')}
                  titleFilled={t('booking.filterTitleClub')}
                  subtitle={cafe?.address ?? ''}
                  hasValue={!!cafe}
                  disabled={false}
                  onPress={openClubPicker}
                />
                <BookingWheelFilterRow
                  styles={styles}
                  colors={colors}
                  icon="calendar-month-outline"
                  emptyHint={t('booking.filterSelectDate')}
                  titleFilled={t('booking.filterTitleDate')}
                  subtitle={
                    nearestSearchDayISO ? formatDateHuman(nearestSearchDayISO) : t('booking.nearestAny')
                  }
                  hasValue
                  disabled={!cafe}
                  onPress={() => {
                    if (!cafe) return;
                    const idx =
                      nearestSearchDayISO == null
                        ? 0
                        : 1 + wheelIndexForCalendarIso(nearestSearchDayISO, datesList);
                    const safeIdx = Math.min(Math.max(0, idx), Math.max(0, nearestSearchDayLabels.length - 1));
                    setPendingNearestDayIdx(safeIdx);
                    pendingNearestDayIdxRef.current = safeIdx;
                    setModalNearestDay(true);
                  }}
                />
                <BookingWheelFilterRow
                  styles={styles}
                  colors={colors}
                  icon="clock-outline"
                  emptyHint={t('booking.filterSelectTimeDuration')}
                  titleFilled={t('booking.filterTitleTime')}
                  subtitle={
                    timeAndDurationReady ? timeDurationFilterSubtitleNearest : ''
                  }
                  hasValue={timeAndDurationReady}
                  disabled={!cafe}
                  onPress={() => {
                    if (!cafe) return;
                    timeModalNearestSearchRef.current = true;
                    setTimeModalForNearestSlotSearch(true);
                    const rawTi = timeSlots.indexOf(timeStart);
                    const ti = nearestSearchTimeAny
                      ? 0
                      : !timeAndDurationReady
                        ? 1 + suggestedTimeIdx
                        : rawTi >= 0
                          ? 1 + rawTi
                          : 1 + suggestedTimeIdx;
                    setPendingTimeIdx(ti);
                    setPendingDurIdx(resolvedDurationWheelIndex);
                    pendingTimeIdxRef.current = ti;
                    pendingDurIdxRef.current = resolvedDurationWheelIndex;
                    void pricesQ.refetch();
                    setModalTimeDuration(true);
                  }}
                />
                <BookingWheelFilterRow
                  styles={styles}
                  colors={colors}
                  icon="layers-outline"
                  emptyHint={t('booking.filterSelectPcTier')}
                  titleFilled={t('booking.filterTitlePcTier')}
                  subtitle={nearestSearchPcTariffLabel}
                  hasValue={nearestSearchZoneReady}
                  disabled={!timeAndDurationReady}
                  onPress={() => {
                    void pricesQ.refetch();
                    setPendingZoneIdx(resolvedZoneWheelIndex);
                    pendingZoneIdxRef.current = resolvedZoneWheelIndex;
                    setModalTariff(true);
                  }}
                />

                {cafe && pricesQ.isLoading ? (
                  <Text style={styles.nearestMenuEmpty}>{t('booking.nearestWaitPrices')}</Text>
                ) : null}

                {cafe && nearestSearchZoneReady ? (
                  <View style={styles.nearestPickPcBlock}>
                    {renderSeatViewToggle('nearest')}
                    {structQ.isError ? (
                      <QueryError
                        message={formatPublicErrorMessage(structQ.error, t, 'booking.errorGeneric')}
                        onRetry={() => void structQ.refetch()}
                        t={t}
                        styles={styles}
                        colors={colors}
                      />
                    ) : structQ.isLoading || (structQ.isFetching && !structQ.data) ? (
                      <ClubDataLoader message={t('common.loader.captionPc')} compact minHeight={200} />
                    ) : seatLayoutMode === 'scheme' ? (
                      structQ.data?.rooms?.length ? (
                        <View style={[styles.mapBlock, styles.mapBlockScheme]}>
                          <MemoClubLayoutCanvas
                            rooms={structQ.data.rooms}
                            colors={colors}
                            icafeId={cafe.icafe_id}
                            zoneFilter={nearestZoneFilter}
                            pcAvailability={nearestSearchPcMapAvailability}
                            onPcPress={onNearestSearchMapPress}
                            minHeight={Math.max(220, Math.round(windowHeight * 0.32))}
                            horizontalPadding={BOOKING_SCROLL_H_PAD * 2}
                            bookingCompact
                          />
                          {hallMapCanonicalLayout ? (
                            <HallMapStatusLegend variant="booking" />
                          ) : (
                            <View style={styles.legend}>
                              <LegendDot styles={styles} color={colors.pcSelected} label={t('hallMap.legendSelected')} />
                              <LegendDot
                                styles={styles}
                                color={colors.pcFree}
                                label={t('booking.legendFree')}
                                hollow
                              />
                            </View>
                          )}
                        </View>
                      ) : (
                        <Text style={styles.hintMuted}>{t('hallMap.emptyZones')}</Text>
                      )
                    ) : !pcs && pcsQuery.isFetching ? (
                      <ClubDataLoader message={t('common.loader.captionPc')} compact minHeight={120} />
                    ) : pcsForNearestSearchUi && pcListSectionsForNearest.length > 0 ? (
                      <View style={[styles.mapBlock, { paddingTop: 8 }]}>
                        {pcListSectionsForNearest.map((section) => (
                          <View key={`nearest-pc-${section.key}`} style={styles.pcZoneSection}>
                            <Text style={styles.pcZoneSectionTitle}>{section.title}</Text>
                            {section.pairs.map((pair, ri) => (
                              <View key={`nearest-pc-row-${section.key}-${ri}`} style={styles.pcListRow}>
                                {pair.map((item, ii) => {
                                  const sel = nearestSearchTargetPcs.some((x) =>
                                    pcNamesLooselyEqual(x.pc_name, item.pc_name),
                                  );
                                  return (
                                    <Pressable
                                      key={`nearest-pc-${item.pc_name}-${section.key}-${ri}-${ii}`}
                                      style={[styles.pcCard, styles.pcCardGridHalf, sel && styles.pcCardSelected]}
                                      onPress={() => toggleNearestTargetPc(item)}
                                    >
                                      <View style={styles.pcCardBodyAboveDim}>
                                        <Text style={styles.pcName} numberOfLines={1}>
                                          {uiPcLabel(item.pc_name)}
                                        </Text>
                                        <Text style={styles.pcSub} numberOfLines={2}>
                                          {formatPublicZoneLabel(pcZoneLabel(item) || '', t)}
                                        </Text>
                                      </View>
                                      {sel ? (
                                        <View style={styles.pcCardCheckAboveDim}>
                                          <MaterialCommunityIcons
                                            name="check-circle"
                                            size={18}
                                            color={colors.pcSelected}
                                          />
                                        </View>
                                      ) : null}
                                    </Pressable>
                                  );
                                })}
                                {pair.length === 1 ? <View style={styles.pcListCellSpacer} /> : null}
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.hintMuted}>{t('booking.noPcsYet')}</Text>
                    )}
                  </View>
                ) : null}
              </ScrollView>
              <View style={styles.nearestMenuFooter}>
                <Pressable
                  style={({ pressed }) => [
                    styles.nearestMenuFindBtn,
                    !canRunNearestSearch && styles.nearestMenuFindBtnDisabled,
                    pressed && canRunNearestSearch && styles.pressed,
                  ]}
                  onPress={() => nearestSlotsMut.mutate()}
                  disabled={!canRunNearestSearch}
                >
                  {nearestSlotsMut.isPending ? (
                    <ActivityIndicator color={colors.accentTextOnButton} />
                  ) : (
                    <Text style={styles.nearestMenuFindBtnText}>{t('booking.nearestRunSearch')}</Text>
                  )}
                </Pressable>
              </View>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <DimmedSheetModal
        visible={modalClub}
        onRequestClose={() => setModalClub(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        contentAlign="flex-end"
      >
        {(onSheetDrag) => (
          <DraggableWheelSheet
            open={modalClub}
            onRequestClose={() => setModalClub(false)}
            onDragOffsetChange={onSheetDrag}
            colors={colors}
            sheetStyle={styles.sheet}
            dragExtendBelowGrabberPx={130}
          >
            <Text style={styles.sheetTitle}>{t('booking.sheetWheelClub')}</Text>
            {cafesQ.isLoading ? (
              <ClubDataLoader message={t('common.loader.captionClub')} compact minHeight={120} />
            ) : cafesQ.isError ? (
              <QueryError
                message={formatPublicErrorMessage(cafesQ.error, t, 'booking.errorGeneric')}
                onRetry={() => cafesQ.refetch()}
                t={t}
                styles={styles}
                colors={colors}
              />
            ) : cafesAll.length === 0 || pickerCities.length === 0 ? (
              <Text style={styles.emptyList}>{t('cafes.empty')}</Text>
            ) : (
              <>
                <View style={styles.wheelDualLabelsRow}>
                  <View style={styles.wheelDualCol}>
                    <Text style={styles.wheelDualColLabel}>{t('booking.sheetWheelColCity')}</Text>
                  </View>
                  <View style={styles.wheelDualCol}>
                    <Text style={styles.wheelDualColLabel}>{t('booking.sheetWheelColStreet')}</Text>
                  </View>
                </View>
                <View style={styles.wheelDualRow}>
                  <View style={styles.wheelDualCol}>
                    <WheelPickerColumn
                      ref={cityWheelRef}
                      active={modalClub}
                      data={cityWheelLabels}
                      valueIndex={Math.min(pendingCityIdx, Math.max(0, pickerCities.length - 1))}
                      onChangeIndex={(i) => {
                        setPendingCityIdx(i);
                        setPendingClubIdx(0);
                        pendingCityIdxRef.current = i;
                        pendingClubIdxRef.current = 0;
                      }}
                      colors={colors}
                      onItemPress={(i) => {
                        setPendingCityIdx(i);
                        setPendingClubIdx(0);
                        pendingCityIdxRef.current = i;
                        pendingClubIdxRef.current = 0;
                      }}
                    />
                  </View>
                  <View style={styles.wheelDualCol}>
                    {clubsInPendingCity.length === 0 ? (
                      <Text style={[styles.emptyList, { paddingVertical: 24 }]}>{t('booking.cityNoClubs')}</Text>
                    ) : (
                      <WheelPickerColumn
                        ref={clubWheelRef}
                        active={modalClub}
                        data={clubWheelLabels}
                        valueIndex={Math.min(
                          pendingClubIdx,
                          Math.max(0, clubsInPendingCity.length - 1),
                        )}
                        onChangeIndex={(idx) => {
                          setPendingClubIdx(idx);
                          pendingClubIdxRef.current = idx;
                        }}
                        colors={colors}
                        onItemPress={(j) =>
                          applyClubWheelSelection(
                            cityWheelRef.current?.getCenterIndex() ??
                              Math.min(pendingCityIdx, pickerCities.length - 1),
                            j,
                          )
                        }
                      />
                    )}
                  </View>
                </View>
              </>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.wheelSheetDone,
                (pickerCities.length === 0 ||
                  clubsInPendingCity.length === 0 ||
                  cafesQ.isLoading ||
                  !!cafesQ.isError) && { opacity: 0.45 },
                pressed && styles.pressed,
              ]}
              onPress={() => {
                if (pickerCities.length === 0) return;
                const ci = Math.min(
                  Math.max(0, cityWheelRef.current?.getCenterIndex() ?? pendingCityIdxRef.current),
                  pickerCities.length - 1,
                );
                const pool = cafesInCity(cafesAll, pickerCities[ci]!.id);
                if (pool.length === 0) return;
                const bi = Math.min(
                  Math.max(0, clubWheelRef.current?.getCenterIndex() ?? pendingClubIdxRef.current),
                  pool.length - 1,
                );
                applyClubWheelSelection(ci, bi);
              }}
              disabled={
                pickerCities.length === 0 ||
                clubsInPendingCity.length === 0 ||
                cafesQ.isLoading ||
                !!cafesQ.isError
              }
            >
              <View style={styles.wheelSheetDoneTextWrap}>
                <Text style={styles.wheelSheetDoneText}>{t('booking.done')}</Text>
              </View>
            </Pressable>
          </DraggableWheelSheet>
        )}
      </DimmedSheetModal>

      <DimmedSheetModal
        visible={modalDate}
        onRequestClose={() => setModalDate(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        contentAlign="flex-end"
      >
        {(onSheetDrag) => (
          <DraggableWheelSheet
            open={modalDate}
            onRequestClose={() => setModalDate(false)}
            onDragOffsetChange={onSheetDrag}
            colors={colors}
            sheetStyle={styles.sheet}
          >
            <Text style={styles.sheetTitle}>{t('booking.sheetWheelDate')}</Text>
            <WheelPickerColumn
              ref={dateWheelRef}
              active={modalDate}
              data={dateListLabels}
              valueIndex={pendingDateIdx}
              onChangeIndex={(idx) => {
                pendingDateIdxRef.current = idx;
              }}
              colors={colors}
              onItemPress={applyDateWheelSelection}
            />
            <Pressable
              style={styles.wheelSheetDone}
              onPress={() =>
                applyDateWheelSelection(dateWheelRef.current?.getCenterIndex() ?? pendingDateIdxRef.current)
              }
            >
              <View style={styles.wheelSheetDoneTextWrap}>
                <Text style={styles.wheelSheetDoneText}>{t('booking.done')}</Text>
              </View>
            </Pressable>
          </DraggableWheelSheet>
        )}
      </DimmedSheetModal>

      <DimmedSheetModal
        visible={modalTimeDuration}
        onRequestClose={closeTimeDurationModal}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        contentAlign="flex-end"
      >
        {(onSheetDrag) => (
          <DraggableWheelSheet
            open={modalTimeDuration}
            onRequestClose={closeTimeDurationModal}
            onDragOffsetChange={onSheetDrag}
            colors={colors}
            sheetStyle={styles.sheet}
            dragExtendBelowGrabberPx={130}
          >
            <Text style={styles.sheetTitle}>{t('booking.sheetWheelTimeDuration')}</Text>
            {pricesQ.isLoading ? (
              <ClubDataLoader message={t('booking.nearestWaitPrices')} compact minHeight={120} />
            ) : null}
            {pricesQ.isError ? (
              <QueryError
                message={formatPublicErrorMessage(pricesQ.error, t, 'booking.errorGeneric')}
                onRetry={() => pricesQ.refetch()}
                t={t}
                styles={styles}
                colors={colors}
              />
            ) : null}
            <View style={styles.wheelDualLabelsRow}>
              <View style={styles.wheelDualCol}>
                <Text style={styles.wheelDualColLabel}>{t('booking.sheetWheelColTime')}</Text>
              </View>
              <View style={styles.wheelDualCol}>
                <Text style={styles.wheelDualColLabel}>{t('booking.sheetWheelColDuration')}</Text>
              </View>
            </View>
            <View style={styles.wheelDualRow}>
              <View style={styles.wheelDualCol}>
                <WheelPickerColumn
                  ref={timeWheelRef}
                  active={modalTimeDuration}
                  data={timeLabelsForDurationModal}
                  valueIndex={pendingTimeIdx}
                  onChangeIndex={(idx) => {
                    pendingTimeIdxRef.current = idx;
                  }}
                  colors={colors}
                  onItemPress={(i) =>
                    applyTimeDurationSelectionFromWheels({
                      timeIndex: i,
                      durationIndex: pendingDurIdxRef.current,
                    })
                  }
                />
              </View>
              <View style={styles.wheelDualCol}>
                <WheelPickerColumn
                  ref={durWheelRef}
                  active={modalTimeDuration}
                  data={durationWheelItems}
                  valueIndex={pendingDurIdx}
                  onChangeIndex={(idx) => {
                    pendingDurIdxRef.current = idx;
                  }}
                  colors={colors}
                  onItemPress={(j) =>
                    applyTimeDurationSelectionFromWheels({
                      timeIndex: pendingTimeIdxRef.current,
                      durationIndex: j,
                    })
                  }
                />
              </View>
            </View>
            {!pricesQ.isLoading && !products.length && !pricesList.length ? (
              <Text style={styles.emptyList}>{t('booking.noPackages')}</Text>
            ) : null}
            <Pressable
              style={styles.wheelSheetDone}
              onPress={() => applyTimeDurationSelectionFromWheels()}
            >
              <View style={styles.wheelSheetDoneTextWrap}>
                <Text style={styles.wheelSheetDoneText}>{t('booking.done')}</Text>
              </View>
            </Pressable>
          </DraggableWheelSheet>
        )}
      </DimmedSheetModal>

      <DimmedSheetModal
        visible={modalTariff}
        onRequestClose={() => setModalTariff(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        contentAlign="flex-end"
      >
        {(onSheetDrag) => (
          <DraggableWheelSheet
            open={modalTariff}
            onRequestClose={() => setModalTariff(false)}
            onDragOffsetChange={onSheetDrag}
            colors={colors}
            sheetStyle={styles.sheet}
          >
            {pricesQ.isLoading ? (
              <ClubDataLoader message={t('booking.nearestWaitPrices')} compact minHeight={120} />
            ) : null}
            {pricesQ.isError ? (
              <QueryError
                message={formatPublicErrorMessage(pricesQ.error, t, 'booking.errorGeneric')}
                onRetry={() => pricesQ.refetch()}
                t={t}
                styles={styles}
                colors={colors}
              />
            ) : (
              <>
                <Text style={styles.sheetTitle}>{t('booking.labelPcTariff')}</Text>
                <Text style={styles.autopickZoneHint}>{t('booking.nearestTariffPcTierHint')}</Text>
                <View style={{ minHeight: WHEEL_VIEWPORT_HEIGHT, marginTop: 8 }}>
                  <WheelPickerColumn
                    ref={zoneWheelRef}
                    active={modalTariff}
                    data={zoneWheelLabels}
                    valueIndex={pendingZoneIdx}
                    onChangeIndex={(idx) => {
                      pendingZoneIdxRef.current = idx;
                    }}
                    colors={colors}
                    onItemPress={applyZoneWheelSelection}
                  />
                </View>
                {products.length === 0 && pricesList.length === 0 && !pricesQ.isLoading ? (
                  <Text style={[styles.muted, { marginTop: 12 }]}>{t('booking.termsEmpty')}</Text>
                ) : null}
              </>
            )}
            <Pressable
              style={styles.wheelSheetDone}
              onPress={() =>
                applyZoneWheelSelection(zoneWheelRef.current?.getCenterIndex() ?? pendingZoneIdxRef.current)
              }
            >
              <View style={styles.wheelSheetDoneTextWrap}>
                <Text style={styles.wheelSheetDoneText}>{t('booking.done')}</Text>
              </View>
            </Pressable>
          </DraggableWheelSheet>
        )}
      </DimmedSheetModal>

      <DimmedSheetModal
        visible={modalTermsPrices}
        onRequestClose={() => setModalTermsPrices(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        contentAlign="stretch"
        contentWrapperStyle={{ flex: 1, justifyContent: 'flex-end' }}
      >
        {(onSheetDrag) => (
          <DraggableScreenSheet
            open={modalTermsPrices}
            onRequestClose={() => setModalTermsPrices(false)}
            onDragOffsetChange={onSheetDrag}
            colors={colors}
            showHeaderClose={false}
            sheetHeightMode="hug"
            extendToBottomEdge={false}
            sheetStyle={{
              backgroundColor: colors.bg,
              paddingHorizontal: 0,
              maxHeight: termsPricesSheetLayout.sheetMaxH,
              width: '100%',
            }}
            dragExtendBelowGrabberPx={100}
          >
            <SafeAreaView
              style={[
                styles.fullSheetSafe,
                {
                  flex: 0,
                  flexGrow: 0,
                  flexShrink: 1,
                  backgroundColor: colors.bg,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  paddingTop: 0,
                  paddingBottom: 12,
                },
              ]}
              edges={['bottom']}
            >
              <Text style={styles.sheetTitle}>{t('booking.nearestTariffRowSubtitle')}</Text>
              {cafe ? (
                <Text style={styles.termsSheetClubName}>
                  {(cafe.name?.trim() || cafe.address || '').trim()}
                </Text>
              ) : (
                <Text style={[styles.muted, { marginBottom: 10 }]}>{t('booking.pricesNeedClub')}</Text>
              )}
              <View style={styles.termsPricesBody}>
                {cafe && pricesQ.isLoading ? (
                  <ClubDataLoader message={t('booking.nearestWaitPrices')} compact minHeight={140} />
                ) : null}
                {cafe && pricesQ.isError ? (
                  <QueryError
                    message={formatPublicErrorMessage(pricesQ.error, t, 'booking.errorGeneric')}
                    onRetry={() => pricesQ.refetch()}
                    t={t}
                    styles={styles}
                    colors={colors}
                  />
                ) : null}
                {cafe && !pricesQ.isLoading && !pricesQ.isError && products.length === 0 && pricesList.length === 0 ? (
                  <Text style={[styles.muted, { marginBottom: 8 }]}>{t('booking.termsEmpty')}</Text>
                ) : null}
                {cafe && !pricesQ.isLoading && !pricesQ.isError && (products.length > 0 || pricesList.length > 0) ? (
                  termsTariffMatrix.length > 0 ? (
                    <View>
                      <View style={styles.termsMatrixTable}>
                        <View style={styles.termsMatrixHeaderRow}>
                          <View style={styles.termsMatrixZoneHeadCell} />
                          {termsMatrixColLabels.map((label, i) => (
                            <Text key={i} style={styles.termsMatrixHeadCellFlex} numberOfLines={1}>
                              {label}
                            </Text>
                          ))}
                        </View>
                        {termsTariffMatrix.map((row) => (
                          <View key={row.zoneKind} style={styles.termsMatrixRow}>
                            <Text style={styles.termsMatrixZoneFlex} numberOfLines={1}>
                              {row.zoneTitle}
                            </Text>
                            {row.cells.map((cell, i) => (
                              <Text key={i} style={styles.termsMatrixPriceFlex} numberOfLines={1}>
                                {cell ?? '—'}
                              </Text>
                            ))}
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <Text style={[styles.muted, { marginBottom: 8, fontSize: 15, lineHeight: 22 }]}>
                      {t('booking.termsNoLongPackages')}
                    </Text>
                  )
                ) : null}
              </View>
              <Pressable
                style={[styles.sheetDone, { marginTop: 16, flexShrink: 0 }]}
                onPress={() => setModalTermsPrices(false)}
              >
                <Text style={styles.sheetDoneText}>{t('booking.close')}</Text>
              </Pressable>
            </SafeAreaView>
          </DraggableScreenSheet>
        )}
      </DimmedSheetModal>

      <DimmedSheetModal
        visible={modalNearestDay}
        onRequestClose={() => setModalNearestDay(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        contentAlign="flex-end"
      >
        {(onSheetDrag) => (
          <DraggableWheelSheet
            open={modalNearestDay}
            onRequestClose={() => setModalNearestDay(false)}
            onDragOffsetChange={onSheetDrag}
            colors={colors}
            sheetStyle={styles.sheet}
          >
            <Text style={styles.sheetTitle}>{t('booking.sheetWheelNearestDay')}</Text>
            <WheelPickerColumn
              ref={nearestDayWheelRef}
              active={modalNearestDay}
              data={nearestSearchDayLabels}
              valueIndex={pendingNearestDayIdx}
              onChangeIndex={(idx) => {
                pendingNearestDayIdxRef.current = idx;
              }}
              colors={colors}
              onItemPress={applyNearestDayWheelSelection}
            />
            <Pressable
              style={styles.wheelSheetDone}
              onPress={() =>
                applyNearestDayWheelSelection(
                  nearestDayWheelRef.current?.getCenterIndex() ?? pendingNearestDayIdxRef.current,
                )
              }
            >
              <View style={styles.wheelSheetDoneTextWrap}>
                <Text style={styles.wheelSheetDoneText}>{t('booking.done')}</Text>
              </View>
            </Pressable>
          </DraggableWheelSheet>
        )}
      </DimmedSheetModal>

      <DimmedSheetModal
        visible={modalOccupancy}
        onRequestClose={() => setModalOccupancy(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        contentAlign="stretch"
        contentWrapperStyle={{ flex: 1 }}
      >
        {(onSheetDrag) => (
          <DraggableScreenSheet
            open={modalOccupancy}
            onRequestClose={() => setModalOccupancy(false)}
            onDragOffsetChange={onSheetDrag}
            colors={colors}
            sheetStyle={{ backgroundColor: colors.bg, paddingHorizontal: 0, flex: 1 }}
            dragExtendBelowGrabberPx={100}
          >
        <SafeAreaView
          style={[
            styles.fullSheetSafe,
            {
              flex: 1,
              backgroundColor: 'transparent',
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              paddingTop: 0,
            },
          ]}
          edges={['bottom']}
        >
          <Text style={styles.sheetTitle}>{t('booking.occupancyTitle')}</Text>
          {selectedPcs.length ? (
            <Text style={styles.occPcHint}>{uiPcList(selectedPcs.map((p) => p.pc_name))}</Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.occDaysScroll}>
            <Pressable
              style={[styles.occDayChip, styles.occNearestChip, occupancyFilterDay === null && styles.occDayChipOn]}
              onPress={() => setOccupancyFilterDay(null)}
            >
              <Text
                style={[
                  styles.occDayChipText,
                  occupancyFilterDay === null && styles.occDayChipTextOn,
                ]}
              >
                {t('booking.occupancyNearest')}
              </Text>
            </Pressable>
            {occupancyDaysStrip.map((d) => {
              const sel = occupancyFilterDay === d;
              return (
                <Pressable
                  key={d}
                  style={[styles.occDayChip, sel && styles.occDayChipOn]}
                  onPress={() => setOccupancyFilterDay(d)}
                >
                  <Text style={[styles.occDayChipText, sel && styles.occDayChipTextOn]}>
                    {formatMoscowCalendarDayShort(d, locale === 'en' ? 'en' : 'ru')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {booksQ.isLoading ? (
            <ClubDataLoader message={t('common.loadingData')} compact minHeight={110} style={{ marginVertical: 12 }} />
          ) : occupancyRowsDisplayed.length === 0 ? (
            <Text style={styles.muted}>
              {occupancyFilterDay === null ? t('booking.occupancyEmptyNearest') : t('booking.occupancyEmpty')}
            </Text>
          ) : (
            occupancyRowsDisplayed.map((r, i) => {
              const iv = intervalFromMemberRow(r);
              const conflict = !!(iv && planIv && intervalsOverlap(iv, planIv));
              const showDateLine = occupancyFilterDay === null && iv;
              return (
                <View
                  key={
                    cafe
                      ? memberBookingRowStableKey(String(cafe.icafe_id), r)
                      : `${r.product_id}-${r.product_pc_name}-${i}`
                  }
                  style={[styles.occRow, conflict ? styles.occRowWarn : null]}
                >
                  {showDateLine ? (
                    <Text style={styles.occRowDate}>
                      {formatMoscowCalendarDayLong(
                        formatISODateMoscow(iv!.start),
                        locale === 'en' ? 'en' : 'ru',
                      )}
                    </Text>
                  ) : null}
                  <Text style={styles.occRowText}>{formatMemberBookingIntervalLine(r, locale)}</Text>
                </View>
              );
            })
          )}
          <Pressable style={styles.sheetDone} onPress={() => setModalOccupancy(false)}>
            <Text style={styles.sheetDoneText}>{t('booking.close')}</Text>
          </Pressable>
        </SafeAreaView>
          </DraggableScreenSheet>
        )}
      </DimmedSheetModal>

      <Modal
        visible={modalBooks}
        animationType="fade"
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
        onRequestClose={() => setModalBooks(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingHorizontal: scrollHPad,
                paddingTop: compactVertical ? 4 : 8,
                paddingBottom: compactVertical ? 4 : 8,
              }}
            >
              <Text style={[styles.sheetTitle, { flex: 1, marginBottom: 0, paddingRight: 10 }]}>
                {t('booking.myBookingsTitle')}
              </Text>
              <Pressable
                onPress={() => setModalBooks(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [
                  {
                    width: compactVertical ? 34 : 36,
                    height: compactVertical ? 34 : 36,
                    borderRadius: compactVertical ? 17 : 18,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginTop: -2 }}>×</Text>
              </Pressable>
            </View>
            {t('booking.myBookingsHint').trim() ? (
              <View style={{ paddingHorizontal: scrollHPad, marginBottom: 8 }}>
                <Text style={styles.myBookingsHint}>{t('booking.myBookingsHint')}</Text>
              </View>
            ) : null}
            <View style={{ flex: 1, minHeight: 0 }}>
              {booksQ.isLoading ? (
                <ClubDataLoader
                  message={t('common.loadingData')}
                  compact
                  minHeight={160}
                  style={{ marginVertical: 16, marginHorizontal: scrollHPad }}
                />
              ) : booksQ.isError ? (
                <View style={{ paddingHorizontal: scrollHPad }}>
                  <QueryError
                    message={formatPublicErrorMessage(booksQ.error, t, 'booking.booksLoadError')}
                    onRetry={() => booksQ.refetch()}
                    t={t}
                    styles={styles}
                    colors={colors}
                  />
                </View>
              ) : booksQ.data && hasAnyMemberBookingRows(booksQ.data) ? (
                <ScrollView
                  style={styles.modalScrollFlex}
                  contentContainerStyle={{
                    paddingHorizontal: scrollHPad,
                    paddingBottom: compactVertical ? 8 : 12,
                  }}
                  keyboardShouldPersistTaps="handled"
                  refreshControl={
                    <RefreshControl
                      refreshing={myBookingsPullRefresh}
                      onRefresh={() => {
                        setMyBookingsPullRefresh(true);
                        void booksQ.refetch().finally(() => setMyBookingsPullRefresh(false));
                      }}
                      tintColor={colors.accentBright}
                      colors={[colors.accentBright]}
                    />
                  }
                >
                  {Object.entries(booksQ.data).map(([icafe, rowsRaw]) => {
                    const rows: MemberBookingRow[] = sortMemberBookingRows(
                      Array.isArray(rowsRaw)
                        ? rowsRaw
                        : rowsRaw && typeof rowsRaw === 'object'
                          ? [rowsRaw as MemberBookingRow]
                          : [],
                      bookingNowMs,
                      { nonEndedSlotOrder: 'newestFirst' },
                    );
                    const activeRows = rows.filter((r) => !isMemberBookingRowInPast(r, bookingNowMs));
                    const historyRows = rows.filter((r) => isMemberBookingRowInPast(r, bookingNowMs));
                    return (
                      <View key={icafe} style={styles.bookBlock}>
                        <Text style={styles.icafe}>{uiClubLabel(cafeLabel(icafe, cafeAddressById))}</Text>
                        {activeRows.length ? (
                          <Text style={styles.bookingsSectionLabel}>{t('booking.bookingsSectionUpcoming')}</Text>
                        ) : null}
                        {activeRows.map((r: MemberBookingRow, i: number) => (
                          <BookingCard
                            key={`a-${r.product_id}-${r.product_pc_name}-${i}`}
                            row={r}
                            locale={locale}
                            styles={styles}
                            t={t}
                            colors={colors}
                            variant="active"
                            canCancel={canCancelMemberBookingRow(r, {
                              memberIdPresent: !!user?.memberId?.trim(),
                              nowMs: bookingNowMs,
                            })}
                            cancelling={cancellingBookKey === memberBookingRowStableKey(icafe, r)}
                            onCancel={() => confirmCancelMemberBooking(r, icafe)}
                            onRepeat={() => {
                              const id = Number(icafe);
                              if (!Number.isFinite(id)) return;
                              navigation.navigate('Booking', {
                                prefill: { icafeId: id, pcName: r.product_pc_name, mins: r.product_mins },
                              });
                              setModalBooks(false);
                            }}
                            nowMs={bookingNowMs}
                          />
                        ))}
                        {historyRows.length ? (
                          <Text style={[styles.bookingsSectionLabel, styles.bookingsSectionLabelHistory]}>
                            {t('booking.bookingsSectionHistory')}
                          </Text>
                        ) : null}
                        {historyRows.map((r: MemberBookingRow, i: number) => (
                          <BookingCard
                            key={`h-${r.product_id}-${r.product_pc_name}-${i}`}
                            row={r}
                            locale={locale}
                            styles={styles}
                            t={t}
                            colors={colors}
                            variant="past"
                            canCancel={false}
                            cancelling={false}
                            onCancel={() => {}}
                            onRepeat={() => {
                              const id = Number(icafe);
                              if (!Number.isFinite(id)) return;
                              navigation.navigate('Booking', {
                                prefill: { icafeId: id, pcName: r.product_pc_name, mins: r.product_mins },
                              });
                              setModalBooks(false);
                            }}
                            nowMs={bookingNowMs}
                          />
                        ))}
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View
                  style={{
                    flex: 1,
                    paddingHorizontal: scrollHPad,
                    justifyContent: 'center',
                    paddingBottom: compactVertical ? 8 : 0,
                  }}
                >
                  <Text style={styles.muted}>{t('booking.noData')}</Text>
                </View>
              )}
            </View>
            <View
              style={{
                paddingHorizontal: scrollHPad,
                paddingTop: compactVertical ? 8 : 12,
                paddingBottom: Math.max(insets.bottom, compactVertical ? 8 : 10),
              }}
            >
              <Pressable style={[styles.sheetDone, { marginTop: 0 }]} onPress={() => setModalBooks(false)}>
                <Text style={styles.sheetDoneText}>{t('booking.close')}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
          {bookingsCancelConfirm ? (
            <View style={[styles.bookingsCancelOverlay, { pointerEvents: 'box-none' }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setBookingsCancelConfirm(null)} />
              <View style={styles.bookingsCancelCard}>
                <Text style={styles.bookingsCancelTitle}>{t('booking.cancelBookingTitle')}</Text>
                <Text style={styles.bookingsCancelBody}>{t('booking.cancelBookingBody')}</Text>
                <View style={styles.bookingsCancelActions}>
                  <Pressable
                    style={({ pressed }) => [styles.bookingsCancelBtnSecondary, pressed && styles.pressed]}
                    onPress={() => setBookingsCancelConfirm(null)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.bookingsCancelBtnSecondaryText}>{t('booking.cancelBookingDismiss')}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.bookingsCancelBtnDanger, pressed && styles.pressed]}
                    onPress={executeBookingsCancel}
                    accessibilityRole="button"
                  >
                    <Text style={styles.bookingsCancelBtnDangerText}>{t('booking.cancelBookingConfirm')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function QueryError({
  message,
  onRetry,
  t,
  styles,
  colors,
}: {
  message: string;
  onRetry: () => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  styles: BookingStyles;
  colors: ColorPalette;
}) {
  return (
    <View style={styles.queryErr}>
      <Text style={styles.queryErrText}>{message}</Text>
      <Pressable style={styles.queryErrBtn} onPress={onRetry}>
        <Text style={styles.queryErrBtnText}>{t('booking.retry')}</Text>
      </Pressable>
    </View>
  );
}

function buildTimeDurationFilterSubtitle(
  styles: BookingStyles,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  locale: AppLocale,
  timePart: string,
  tariff: TariffChoice | null,
  minsNum: number,
  pricesList: PriceItem[],
  productsCatalog: ProductItem[],
  packageZone: PcZoneKind,
  showSavingBenefit: boolean,
): React.ReactNode {
  if (!tariff) return `${timePart} · ${t('booking.durationNotChosen')}`;
  if (tariff.kind === 'product') {
    const duration = formatBookingDurationHuman(bookingPackageWheelDisplayMins(tariff.item, minsNum), locale);
    if (!duration) {
      return `${timePart} · ${t('booking.packageWheelNoDuration', { line: productTierLabel(tariff.item) })}`;
    }
    const line1 = t('booking.packageWheelLine1', { duration });
    const pct =
      showSavingBenefit && (pricesList.length || productsCatalog.length)
        ? packageSavingPercentForWheel(tariff.item, pricesList, productsCatalog, packageZone)
        : null;
    const head = `${timePart} · ${line1}`;
    if (pct == null) {
      return (
        <Text style={styles.filterWheelSubtitle} numberOfLines={1} ellipsizeMode="tail">
          {head}
        </Text>
      );
    }
    return (
      <Text style={styles.filterWheelSubtitle} numberOfLines={1} ellipsizeMode="tail">
        {head}
        <Text style={styles.filterWheelSubtitleCaption}>
          {' '}
          {t('booking.packageVsHourlyPercent', { n: pct })}
        </Text>
      </Text>
    );
  }
  if (!HOURLY_DURATION_PRESETS_BASE.includes(minsNum)) {
    const dur = formatBookingDurationHuman(minsNum, locale);
    const line1 = t('booking.packageWheelLine1', { duration: dur });
    const pct =
      showSavingBenefit && (pricesList.length || productsCatalog.length)
        ? packageSavingPercentForPresetPackageMinutes(
            minsNum,
            pricesList,
            productsCatalog,
            packageZone,
            showSavingBenefit,
          )
        : null;
    const head = `${timePart} · ${line1}`;
    if (pct == null) {
      return (
        <Text style={styles.filterWheelSubtitle} numberOfLines={1} ellipsizeMode="tail">
          {head}
        </Text>
      );
    }
    return (
      <Text style={styles.filterWheelSubtitle} numberOfLines={1} ellipsizeMode="tail">
        {head}
        <Text style={styles.filterWheelSubtitleCaption}>
          {' '}
          {t('booking.packageVsHourlyPercent', { n: pct })}
        </Text>
      </Text>
    );
  }
  return `${timePart} · ${hourlyPresetLineLabel(minsNum, t, locale)}`;
}

function BookingWheelFilterRow({
  styles,
  colors,
  icon,
  emptyHint,
  titleFilled,
  subtitle,
  hasValue,
  disabled,
  onPress,
}: {
  styles: BookingStyles;
  colors: ColorPalette;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  emptyHint: string;
  titleFilled: string;
  subtitle: React.ReactNode;
  hasValue: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterWheelRow,
        disabled && styles.filterWheelRowDisabled,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.filterWheelRowIconWrap}>
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={disabled ? colors.muted : hasValue ? colors.accentBright : colors.muted}
          style={styles.filterWheelIcon}
        />
      </View>
      <View style={styles.filterWheelTextBlock}>
        <Text
          style={hasValue ? styles.filterWheelTitleAccent : styles.filterWheelEmpty}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {hasValue ? titleFilled : emptyHint}
        </Text>
        {hasValue ? (
          <View style={styles.filterWheelSubtitleSlot}>
            {typeof subtitle === 'string' ? (
              <Text style={styles.filterWheelSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
              </Text>
            ) : (
              <View style={styles.filterWheelSubtitleRichClamp}>{subtitle}</View>
            )}
          </View>
        ) : null}
      </View>
      <View style={styles.filterWheelRowIconWrap}>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
}

function ChoiceRow({
  styles,
  colors,
  icon,
  label,
  value,
  onPress,
  filled,
}: {
  styles: BookingStyles;
  colors: ColorPalette;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  onPress: () => void;
  filled: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.choiceRow, filled && styles.choiceRowAccent, pressed && styles.pressed]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={filled ? colors.accentBright : colors.muted}
        style={styles.choiceIcon}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceLabel}>{label}</Text>
        <Text style={[styles.choiceValue, !filled && styles.choiceValueMuted]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

function LegendDot({
  styles,
  color,
  label,
  hollow,
}: {
  styles: BookingStyles;
  color: string;
  label: string;
  hollow?: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          hollow
            ? { backgroundColor: 'transparent', borderWidth: 2, borderColor: color }
            : { backgroundColor: color },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function BookingCard({
  row,
  locale,
  styles,
  t,
  colors,
  variant,
  canCancel,
  cancelling,
  onCancel,
  onRepeat,
  nowMs,
}: {
  row: MemberBookingRow;
  locale: 'ru' | 'en';
  styles: BookingStyles;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  colors: ColorPalette;
  variant: 'active' | 'past';
  canCancel: boolean;
  cancelling: boolean;
  onCancel: () => void;
  onRepeat: () => void;
  nowMs: number;
}) {
  const st = bookingRowLifecycleStatus(row, nowMs);
  const statusLabel =
    st === 'upcoming'
      ? t('booking.bookingStatusUpcoming')
      : st === 'active'
        ? t('booking.bookingStatusActive')
        : st === 'ended'
          ? t('booking.bookingStatusEnded')
          : '';
  const cardStyle = variant === 'past' ? [styles.userBookCard, styles.userBookCardPast] : styles.userBookCard;
  const statusStyle =
    variant === 'past' ? [styles.userBookStatus, styles.userBookStatusPast] : styles.userBookStatus;
  return (
    <View style={cardStyle}>
      {statusLabel ? <Text style={statusStyle}>{statusLabel}</Text> : null}
      {variant === 'past' ? (
        <Text style={styles.userBookPastHint}>{t('booking.bookingPastSubtitle')}</Text>
      ) : null}
      <Text style={variant === 'past' ? styles.userBookPcMuted : styles.userBookPc}>
        {formatPublicPcLabel(row.product_pc_name, t)}
      </Text>
      <Text style={styles.userBookTime}>{formatMemberBookingIntervalLine(row, locale)}</Text>
      <View style={styles.bookCardActionsRow}>
        {canCancel ? (
          <Pressable
            style={({ pressed }) => [styles.cancelBookBtnOutline, pressed && styles.pressed]}
            onPress={onCancel}
            disabled={cancelling}
            accessibilityRole="button"
            accessibilityLabel={t('booking.cancelBooking')}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text style={styles.cancelBookBtnOutlineText}>{t('booking.cancelBooking')}</Text>
            )}
          </Pressable>
        ) : null}
        {variant === 'past' || canShowRepeatMemberBookingRow(row, nowMs) ? (
          <Pressable style={styles.repeatBookBtn} onPress={onRepeat}>
            <Text style={styles.repeatBookBtnText}>{t('booking.repeatBooking')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createBookingStyles(colors: ColorPalette, theme: ThemeName, scrollHPad: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    bookingMainColumn: { flex: 1 },
    bookingScrollFlex: { flex: 1 },
    /** Кнопки брони и «Условия» вне ScrollView — всегда над таб-баром. */
    bookingFooter: {
      paddingHorizontal: scrollHPad,
      paddingTop: 14,
      backgroundColor: colors.bg,
    },
    /** Чуть поднимаем контент к заголовку, не меняя сам верхний отступ от SafeArea до «Бронь». */
    topBarLift: { marginBottom: -8 },
    scroll: { paddingHorizontal: scrollHPad, paddingTop: 2, paddingBottom: 10 },
    warn: { color: colors.danger, marginBottom: 12, lineHeight: 22, fontSize: 15 },
    choiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    choiceRowAccent: {
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: colors.accentDark,
    },
    choiceIcon: { marginRight: 10 },
    choiceLabel: { color: colors.accentBright, fontSize: 15, fontWeight: '600' },
    choiceValue: { color: colors.text, fontSize: 17, marginTop: 4, fontWeight: '600' },
    choiceValueMuted: { color: colors.muted },
    partyBlock: { marginBottom: 10 },
    partyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
      height: FILTER_WHEEL_ROW_HEIGHT,
    },
    partyLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
    partyBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.zoneBg,
      borderRadius: 10,
    },
    partyBtnText: { fontSize: 22, fontWeight: '700', color: colors.accentBright },
    partyValue: { fontSize: 20, fontWeight: '700', color: colors.text, minWidth: 32, textAlign: 'center' },
    autopickZoneHint: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 10 },
    autopickZoneChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    occupancyBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: colors.accentDim,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    occupancyBtnText: { color: colors.accentBright, fontWeight: '700', fontSize: 13 },
    btnGlobalSearch: {
      backgroundColor: colors.zoneBg,
      borderRadius: 12,
      paddingVertical: 11,
      alignItems: 'center',
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnGlobalSearchText: { color: colors.text, fontWeight: '700', fontSize: 16 },
    nearestSheetClubLine: {
      color: colors.muted,
      fontSize: 14,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    nearestMenuHint: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    nearestResultsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    nearestResultsBackBtn: {
      minWidth: 48,
      minHeight: 48,
      paddingVertical: 8,
      paddingHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    /** Баланс ряда с кнопкой «назад» (вместо текста «Закрыть» — крестик в ручке шторки) */
    nearestHeaderCloseSpacer: {
      minWidth: 48,
    },
    nearestResultsTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    nearestPcTypeSection: {
      marginBottom: 16,
    },
    nearestPcTypeTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    nearestPartyHint: {
      color: colors.muted,
      fontSize: 14,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    nearestMenuFindBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    nearestMenuFindBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 16 },
    nearestMenuFindBtnDisabled: {
      opacity: 0.42,
    },
    nearestMenuScrollContent: {
      paddingBottom: 12,
    },
    nearestMenuFooter: {
      paddingTop: 12,
    },
    nearestMenuEmpty: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    nearestScreenRoot: {
      flex: 1,
    },
    nearestScreenSafe: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    nearestScreenHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    nearestScreenCloseBtn: {
      minWidth: 48,
      minHeight: 48,
      paddingVertical: 8,
      paddingHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    nearestPickPcBlock: {
      marginTop: 8,
      paddingTop: 10,
    },
    nearestPickPcHint: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    overlapBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      marginBottom: 12,
      backgroundColor: colors.zoneBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    overlapBannerText: { flex: 1, color: colors.danger, fontSize: 14, lineHeight: 20, fontWeight: '600' },
    crossClubRow: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    nearestResultCard: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    nearestResultTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 22,
    },
    nearestResultMeta: {
      color: colors.muted,
      marginTop: 6,
      fontSize: 15,
      lineHeight: 21,
    },
    nearestResultActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 12,
      alignItems: 'center',
    },
    nearestResultBtnPrimary: {
      flexGrow: 1,
      minWidth: 120,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: 'center',
    },
    nearestResultBtnPrimaryText: { color: colors.text, fontWeight: '700', fontSize: 15 },
    crossClubAddr: { color: colors.text, fontWeight: '700', fontSize: 16 },
    crossClubWhen: { color: colors.muted, marginTop: 6, fontSize: 15 },
    crossClubApply: { color: colors.accentBright, fontWeight: '700', marginTop: 8, fontSize: 15 },
    occPcHint: { color: colors.muted, marginBottom: 12, fontSize: 15 },
    occDaysScroll: { marginBottom: 12, maxHeight: 48 },
    occNearestChip: { paddingHorizontal: 14 },
    occDayChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginRight: 8,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    occDayChipOn: { backgroundColor: colors.chipOn, borderColor: colors.accent },
    occDayChipText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
    occDayChipTextOn: { color: colors.text },
    occRow: {
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    occRowWarn: { borderColor: colors.danger, backgroundColor: colors.zoneBg },
    occRowDate: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 4 },
    occRowText: { color: colors.text, fontSize: 15 },
    bookCardActionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 12,
      alignItems: 'center',
    },
    cancelBookBtnOutline: {
      borderWidth: 1,
      borderColor: colors.danger,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      minWidth: 108,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBookBtnOutlineText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
    repeatBookBtn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    repeatBookBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 15 },
    mapBlock: { marginBottom: 0, overflow: 'hidden', position: 'relative' },
    /** В режиме схемы не растягиваем блок по flex — иначе под картой пустота до легенды. Затемнение вылезает за padding (во всю ширину окна). */
    mapBlockScheme: { alignSelf: 'stretch', position: 'relative' },
    /** Затемнение карточки в списке при блокировке выбора; текст и статус ПК рисуются поверх (`pcCardBodyAboveDim`). */
    pcCardDimLock: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.34)',
      borderRadius: 10,
      zIndex: 0,
    },
    pcCardBodyAboveDim: {
      flex: 1,
      minWidth: 0,
      zIndex: 1,
    },
    pcCardCheckAboveDim: { zIndex: 1, alignSelf: 'center' },
    seatViewToggleRow: {
      flexDirection: 'row',
      marginBottom: 8,
      backgroundColor: colors.zoneBg,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    /** Модалка «ближайшие окна»: без внешней рамки — иначе две лишние горизонтальные полоски над/под сегментом. */
    seatViewToggleRowNearest: {
      borderWidth: 0,
      borderColor: 'transparent',
    },
    seatViewToggleBtn: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    mapOccupancyBtn: { marginTop: 6, alignSelf: 'flex-start' },
    seatViewToggleBtnActive: {
      backgroundColor: colors.accentDim,
    },
    seatViewToggleText: { fontSize: 15, fontWeight: '600', color: colors.muted },
    seatViewToggleTextActive: { color: colors.text },
    sessionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
      padding: 10,
      backgroundColor: colors.accentDim,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sessionBannerText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
      marginTop: 8,
      marginBottom: 8,
      paddingTop: 0,
      paddingBottom: 4,
      backgroundColor: colors.zoneBg,
      borderRadius: 10,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    switchLabel: { color: colors.muted, fontSize: 15 },
    btnSecondary: {
      backgroundColor: colors.accentSecondary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 16,
    },
    btnSecondaryText: { color: colors.text, fontWeight: '700', fontSize: 17 },
    hintMuted: { color: colors.muted, fontSize: 14, marginBottom: 8, textAlign: 'center' },
    hintWarn: { color: colors.danger, fontSize: 14, marginBottom: 12, textAlign: 'center' },
    pcCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginBottom: 4,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
      overflow: 'hidden',
    },
    pcCardBusy: { opacity: 0.55 },
    pcCardSelected: { borderColor: colors.pcSelected, backgroundColor: colors.chipOn },
    pcListRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
      marginBottom: 4,
    },
    pcZoneSection: {
      marginBottom: 8,
    },
    pcZoneSectionTitle: {
      color: colors.accentBright,
      fontSize: 13,
      fontWeight: '800',
      /** Без `uppercase`: в DIN Round Pro заглавные O в «BOOTCAMP»/«GAMEZONE» выглядят как ноль и грубее обычного O. */
      marginTop: 2,
      marginBottom: 6,
      letterSpacing: 0.15,
    },
    pcCardGridHalf: {
      flex: 1,
      minWidth: 0,
      marginBottom: 0,
    },
    pcListCellSpacer: {
      flex: 1,
      minWidth: 0,
    },
    pcName: { color: colors.text, fontWeight: '700', fontSize: 15, lineHeight: 18 },
    pcSub: { color: colors.muted, fontSize: 12, lineHeight: 15, marginTop: 1 },
    bottomActions: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'stretch',
    },
    btnGrey: {
      flex: 1,
      backgroundColor: colors.mutedDark,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 10,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 52,
    },
    btnMyBookingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    myBookingsCountBadge: {
      position: 'absolute',
      top: -8,
      right: -8,
      minWidth: 24,
      height: 24,
      paddingHorizontal: 7,
      borderRadius: 12,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    myBookingsCountBadgeText: {
      color: colors.accentTextOnButton,
      fontWeight: '800',
      fontSize: 14,
      lineHeight: 14,
      textAlign: 'center',
      includeFontPadding: false,
      textAlignVertical: 'center',
      marginTop: -1,
    },
    btnGreyText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
    /** Есть хотя бы одна бронь в истории — заметная «активная» кнопка (серый вид только при пустой истории). */
    btnMyBookingsHasHistory:
      theme === 'dark'
        ? { backgroundColor: '#ffffff' }
        : {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          },
    btnMyBookingsHasHistoryText:
      theme === 'dark' ? { color: '#1b222a' } : { color: colors.text },
    btnPrimary: {
      flex: 1.25,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 52,
    },
    bookPrimaryBlocked: {
      flex: 1.25,
      minWidth: 0,
      minHeight: 52,
      paddingVertical: 8,
      paddingHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bookPrimaryBlockedText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'center',
    },
    bookPrimaryBlockedTextWarn: {
      color: colors.danger,
      fontWeight: '600',
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'center',
    },
    btnPrimaryDisabled: { opacity: 0.45 },
    btnPrimaryLine1: {
      color: colors.accentTextOnButton,
      fontWeight: '700',
      fontSize: 16,
      textAlign: 'center',
    },
    btnPrimaryLine2: {
      color: colors.accentTextOnButton,
      fontWeight: '600',
      fontSize: 12,
      marginTop: 1,
      textAlign: 'center',
    },
    termsLink: { alignSelf: 'center', marginTop: 2, paddingVertical: 3, paddingHorizontal: 6 },
    termsLinkText: { color: colors.accentBright, fontSize: 15, fontWeight: '600' },
    pressed: { opacity: 0.88 },
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },
    sheetModalRoot: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },
    sheetModalSpacer: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    filterWheelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginBottom: 8,
      height: FILTER_PLATE_ROW_HEIGHT,
    },
    filterWheelIcon: { marginRight: 0 },
    filterWheelRowIconWrap: { width: 22, alignItems: 'center', justifyContent: 'center' },
    filterWheelRowDisabled: { opacity: 0.42 },
    /** У карточки фиксированная высота; в filled-состоянии показываем компактную вторую строку. */
    filterWheelTextBlock: { flex: 1, justifyContent: 'center', minWidth: 0 },
    filterWheelSubtitleSlot: {
      marginTop: 1,
      height: FILTER_PLATE_SUBTITLE_SLOT_HEIGHT,
      justifyContent: 'center',
    },
    filterWheelSubtitleRichClamp: { maxHeight: FILTER_PLATE_SUBTITLE_SLOT_HEIGHT, overflow: 'hidden' },
    filterWheelEmpty: { fontSize: 14, fontWeight: '600', color: colors.muted, lineHeight: 17 },
    filterWheelTitleAccent: { fontSize: 14, fontWeight: '600', color: colors.accentBright, lineHeight: 17 },
    filterWheelSubtitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 15,
    },
    filterWheelSubtitleCaption:
      theme === 'dark'
        ? { fontSize: 12, fontWeight: '600', color: colors.muted }
        : { fontSize: 12, fontWeight: '600', color: colors.muted, opacity: 0.92 },
    wheelDualLabelsRow: {
      flexDirection: 'row',
      marginTop: 8,
      paddingBottom: 8,
    },
    wheelDualRow: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    wheelDualCol: {
      flex: 1,
      flexBasis: 0,
      minWidth: 0,
      overflow: 'hidden',
    },
    wheelDualColLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    wheelSheetDone: {
      marginTop: 12,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    wheelSheetDoneTextWrap: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelSheetDoneText: {
      color: colors.accentTextOnButton,
      fontWeight: '700',
      fontSize: 16,
      textAlign: 'center',
      alignSelf: 'center',
      ...Platform.select({
        android: { includeFontPadding: false, textAlignVertical: 'center' as const },
        default: {},
      }),
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 20,
      maxHeight: '88%',
      ...(Platform.OS === 'android' ? { elevation: 12 } : {}),
      ...(Platform.OS === 'web' ? { boxShadow: '0 -2px 8px rgba(0,0,0,0.2)' } : {}),
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          }
        : {}),
    },
    sheetScroll: { maxHeight: 420 },
    sheetChipColumn: { gap: 10, paddingBottom: 8 },
    sheetChipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingBottom: 8,
    },
    sheetChip: {
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: 'transparent',
    },
    sheetChipHalf: {
      width: '48%',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: 'transparent',
    },
    sheetChipQuarter: {
      width: '31%',
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: 'transparent',
      alignItems: 'center',
    },
    sheetChipOn: {
      backgroundColor: colors.accentDark,
      borderColor: colors.accent,
    },
    sheetChipText: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
    sheetChipTextSm: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
    sheetChipTextOn: { color: colors.text },
    fullSheet: {
      flex: 1,
      backgroundColor: colors.bg,
      marginTop: 80,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
    },
    fullSheetSafe: {
      flex: 1,
      backgroundColor: colors.bg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    modalListFlex: { flexGrow: 1, flexShrink: 1, maxHeight: 400 },
    modalScrollFlex: { flex: 1, flexGrow: 1 },
    sheetTitle: { fontSize: 19, fontWeight: '700', color: colors.text, marginBottom: 12 },
    sheetHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    sheetHeaderClose: { color: colors.accentBright, fontWeight: '600', fontSize: 16 },
    sheetHeaderClosePressable: {
      minHeight: 48,
      paddingVertical: 10,
      paddingHorizontal: 4,
      justifyContent: 'center',
    },
    subSheetTitle: { fontSize: 16, fontWeight: '600', color: colors.muted, marginTop: 8, marginBottom: 8 },
    sheetItem: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sheetItemOn: { backgroundColor: colors.chipOn },
    sheetItemText: { color: colors.text, fontSize: 17 },
    sheetDone: {
      marginTop: 16,
      backgroundColor: colors.accentSecondary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    sheetDoneText: { color: colors.text, fontWeight: '700', fontSize: 17 },
    /** Название клуба — контрастнее подсказки (на тёмном фоне фактически белый `colors.text`). */
    termsSheetClubName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    termsPricesBody: { width: '100%' },
    termsMatrixHint: { fontSize: 13, color: colors.muted, marginBottom: 10, lineHeight: 18 },
    termsMatrixTable: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    termsMatrixHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    termsMatrixZoneHeadCell: {
      width: 86,
      flexShrink: 0,
      minHeight: 36,
    },
    termsMatrixHeadCellFlex: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 8,
      paddingHorizontal: 2,
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    termsMatrixRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.bg,
    },
    termsMatrixZoneFlex: {
      width: 86,
      flexShrink: 0,
      paddingVertical: 10,
      paddingHorizontal: 6,
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    termsMatrixPriceFlex: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 10,
      paddingHorizontal: 2,
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    bookingsCancelOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: 20,
      zIndex: 20,
    },
    bookingsCancelCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bookingsCancelTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
    bookingsCancelBody: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 18 },
    bookingsCancelActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' },
    bookingsCancelBtnSecondary: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    bookingsCancelBtnSecondaryText: { color: colors.text, fontWeight: '600', fontSize: 16 },
    bookingsCancelBtnDanger: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.zoneBg,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    bookingsCancelBtnDangerText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
    emptyList: { color: colors.muted, padding: 12 },
    tariffLine: { color: colors.muted, marginBottom: 10, fontSize: 15 },
    tariffGroupBlock: { marginBottom: 14 },
    tariffGroupTitle: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 6 },
    packageSectionHeader: { color: colors.muted, fontWeight: '700', fontSize: 13, marginTop: 8, marginBottom: 4 },
    bookBlock: { marginBottom: 16 },
    icafe: { color: colors.text, fontWeight: '700', marginBottom: 8 },
    myBookingsHint: { color: colors.muted, fontSize: 13, marginBottom: 10, lineHeight: 18 },
    userBookCard: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userBookCardPast: {
      opacity: 0.88,
      backgroundColor: colors.zoneBg,
      borderColor: colors.border,
    },
    bookingsSectionLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
      marginTop: 4,
    },
    bookingsSectionLabelHistory: { marginTop: 14 },
    userBookPastHint: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 6,
      lineHeight: 16,
    },
    userBookStatus: {
      alignSelf: 'flex-start',
      marginBottom: 8,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
      fontSize: 12,
      fontWeight: '800',
      color: colors.accentBright,
      backgroundColor: colors.accentDim,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    userBookStatusPast: {
      color: colors.muted,
      backgroundColor: colors.bg,
    },
    userBookPc: { color: colors.accentBright, fontWeight: '700', fontSize: 16 },
    userBookPcMuted: { color: colors.muted, fontWeight: '700', fontSize: 16 },
    userBookTime: { color: colors.muted, marginTop: 6, fontSize: 15 },
    muted: { color: colors.muted },
    queryErr: { padding: 12, marginBottom: 12, backgroundColor: colors.zoneBg, borderRadius: 12 },
    queryErrText: { color: colors.danger, marginBottom: 8, fontSize: 14 },
    queryErrBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.accentDim, borderRadius: 10 },
    queryErrBtnText: { color: colors.text, fontWeight: '600' },
    successOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      padding: 24,
    },
    bookingNoticeOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'center',
      padding: 24,
    },
    bookingNoticeCard: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 22,
      paddingTop: 22,
      paddingBottom: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    bookingNoticeTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    bookingNoticeMessage: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 24,
      marginTop: 12,
    },
    bookingNoticeBtnRow: {
      marginTop: 22,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    bookingNoticeBtn: {
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 28,
      alignItems: 'center',
    },
    bookingNoticeBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 16 },
    successCard: { alignItems: 'center' },
    successTitle: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 34,
    },
    successDescr: {
      color: colors.muted,
      fontSize: 18,
      textAlign: 'center',
      marginTop: 24,
      lineHeight: 26,
    },
    successBtnSecondary: {
      marginTop: 20,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      minWidth: 200,
      alignItems: 'center',
    },
    successBtnSecondaryText: { color: colors.accentBright, fontWeight: '600', fontSize: 16 },
    successBtn: {
      marginTop: 16,
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 48,
      minWidth: 200,
      alignItems: 'center',
    },
    successBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 18 },
  });
}
