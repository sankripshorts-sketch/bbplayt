import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
/** Фиксированная высота карточек фильтров (layout). */
const FILTER_WHEEL_ROW_HEIGHT = 60;
/** Компактная вторая строка под адрес/значение фильтра. */
const FILTER_WHEEL_SUBTITLE_SLOT_HEIGHT = 16;
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
  cancelVisitFeedbackReminderForRow,
  scheduleBookingRemindersFromPrefs,
} from '../../notifications/bookingReminders';
import { clampParty, loadAppPreferences, patchAppPreferences } from '../../preferences/appPreferences';
import { queryKeys } from '../../query/queryKeys';
import { SkeletonBlock } from '../ui/SkeletonBlock';
import { TabSettingsButton } from '../../components/TabSettingsButton';
import type { BookingPrefillParams, MainTabParamList } from '../../navigation/types';
import { TodaysBookingBanner } from './TodaysBookingBanner';
import { DraggableWheelSheet } from './DraggableWheelSheet';
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
  findOverlappingBookingForPc,
  findOverlappingOutstandingBooking,
  formatIntervalClock,
  hasAnyMemberBookingRows,
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
  type NearestWindowCandidate,
} from './nearestWindowSearch';
import { pcMatchesNearestZoneFilter, type NearestZoneFilter } from './nearestZoneFilter';
import { pcZoneKindFromPc, type PcZoneKind } from './pcZoneKind';
import {
  bookingMinsAfterTariffSelect,
  bookingPackageWheelDisplayMins,
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
  priceHourlyStepLabel,
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
  pcPriceZoneKey,
  pcZoneLabel,
  packageSavingPercentForWheel,
  priceBookingRubForResolvedTier,
  priceItemsForPcZoneKind,
  priceItemsGameZoneOnly,
  wheelGameZoneProductForSavingLabel,
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
): number | null {
  const match = productsCatalog.find((p) => bookingPackageWheelDisplayMins(p, 0) === mins);
  if (match) {
    const fromCatalog = packageSavingPercentForWheel(match, pricesList, productsCatalog);
    if (fromCatalog != null) return fromCatalog;
    const ref = wheelGameZoneProductForSavingLabel(match, productsCatalog);
    const rub = productPackagePriceRub({ kind: 'product', item: ref });
    if (Number.isFinite(rub) && rub > 0) {
      const gzPrices = priceItemsGameZoneOnly(pricesList);
      const g = gzPrices.length > 0 ? gameZonePerHourPackageSavingPercent(mins, rub, gzPrices) : null;
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
): WheelPickerItem {
  if (HOURLY_DURATION_PRESETS_BASE.includes(mins)) {
    return hourlyPresetLineLabel(mins, t, locale);
  }
  const dur = formatBookingDurationHuman(mins, locale);
  const line1 = t('booking.packageWheelLine1', { duration: dur });
  if (!pricesList.length && !productsCatalog.length) return line1;
  const pct = packageSavingPercentForPresetPackageMinutes(mins, pricesList, productsCatalog, packageZone);
  if (pct != null) return { main: line1, sub: t('booking.packageVsHourlyPercent', { n: pct }) };
  return line1;
}

function productWheelLineLabel(
  p: ProductItem,
  locale: AppLocale,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  pricesList: PriceItem[],
  productsCatalog: ProductItem[],
): WheelPickerItem {
  const mins = bookingPackageWheelDisplayMins(p, 0);
  const dur = formatBookingDurationHuman(mins, locale);
  let line1 = dur
    ? t('booking.packageWheelLine1', { duration: dur })
    : t('booking.packageWheelNoDuration', { line: productTierLabel(p) });
  if (!pricesList.length && !productsCatalog.length) return line1;
  const pct = packageSavingPercentForWheel(p, pricesList, productsCatalog);
  if (pct != null) return { main: line1, sub: t('booking.packageVsHourlyPercent', { n: pct }) };
  return line1;
}

const PC_REFETCH_INTERVAL_MS = 60_000;
const ZONE_WHEEL_KEYS = ['any', 'VIP', 'BootCamp', 'GameZone'] as const;
/** Обычный список ПК на экране брони — без поиска «ближайшего окна» (он для поиска по всем клубам). */
const IS_FIND_WINDOW_MAIN = false;

type BookingStyles = ReturnType<typeof createBookingStyles>;

export function BookingScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isFocused = useIsFocused();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Booking'>>();
  const { t, locale } = useLocale();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createBookingStyles(colors, theme), [colors, theme]);
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
  const [partySize, setPartySize] = useState(1);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const partyBoot = useRef(true);
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
  const [pendingDateIdx, setPendingDateIdx] = useState(0);
  const [pendingTimeIdx, setPendingTimeIdx] = useState(0);
  const [pendingDurIdx, setPendingDurIdx] = useState(0);
  const [pendingZoneIdx, setPendingZoneIdx] = useState(0);
  const pendingTimeIdxRef = useRef(0);
  const pendingDurIdxRef = useRef(0);
  const clubWheelRef = useRef<WheelPickerColumnHandle>(null);
  const dateWheelRef = useRef<WheelPickerColumnHandle>(null);
  const timeWheelRef = useRef<WheelPickerColumnHandle>(null);
  const durWheelRef = useRef<WheelPickerColumnHandle>(null);
  const zoneWheelRef = useRef<WheelPickerColumnHandle>(null);
  const nearestDayWheelRef = useRef<WheelPickerColumnHandle>(null);
  /** Отмена сетевых запросов поиска ближайшего окна (закрытие шторки / новый поиск). */
  const nearestSearchAbortRef = useRef<AbortController | null>(null);
  /** Актуальная дата сетки времени (для async в `applyTimeDurationWheelSelection`). */
  const effectiveDateForTimeSlotsRef = useRef<string>(dateStart);
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
  /** Для поиска «ближайшее окно»: `null` — без ограничения по дню (с текущего момента). */
  const [nearestSearchDayISO, setNearestSearchDayISO] = useState<string | null>(null);
  /** `true` — время для поиска «не важно» (якорь только от «сейчас» / дня); иначе — не раньше выбранного слота. */
  const [nearestSearchTimeAny, setNearestSearchTimeAny] = useState(true);
  const [modalNearestDay, setModalNearestDay] = useState(false);
  const [pendingNearestDayIdx, setPendingNearestDayIdx] = useState(0);
  /** Шторка «время/длительность» открыта из меню ближайшего окна — в колесе времени есть пункт «Без разницы». */
  const [timeModalForNearestSlotSearch, setTimeModalForNearestSlotSearch] = useState(false);

  /** Тип ПК только для поиска «ближайшее окно» (не смешивает зоны для компании — см. pickPcsForPartyForPlan). */
  const [nearestSearchPcZone, setNearestSearchPcZone] = useState<'any' | 'VIP' | 'BootCamp' | 'GameZone'>('any');
  const nearestZoneFilter: NearestZoneFilter = useMemo(
    () =>
      nearestSearchPcZone === 'any' ? { mode: 'any' } : { mode: 'kinds', kinds: [nearestSearchPcZone] },
    [nearestSearchPcZone],
  );
  /** На основном экране брони схема и список показывают все зоны; фильтр по зоне только в поиске ближайшего окна. */
  const bookingMapZoneFilter: NearestZoneFilter = useMemo(() => ({ mode: 'any' }), []);
  /** Отображение схемы зала или списка мест (по умолчанию — схема). */
  const [seatLayoutMode, setSeatLayoutMode] = useState<'scheme' | 'list'>('scheme');
  /** Зона тарифа ПК для пакетов 3 ч / 5 ч в колесе и подписи «выгоднее»: по первому выбранному ПК. */
  const effectivePackageZone = useMemo((): PcZoneKind => {
    if (selectedPcs.length > 0) return pcZoneKindFromPc(selectedPcs[0]!);
    return 'GameZone';
  }, [selectedPcs]);
  const [modalOccupancy, setModalOccupancy] = useState(false);
  /** `null` — ближайшие брони по времени; иначе фильтр по календарному дню YYYY-MM-DD (МСК). */
  const [occupancyFilterDay, setOccupancyFilterDay] = useState<string | null>(null);
  const [pendingPrefill, setPendingPrefill] = useState<BookingPrefillParams | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successPcLine, setSuccessPcLine] = useState<string | null>(null);
  const [cancellingBookKey, setCancellingBookKey] = useState<string | null>(null);
  /** Только жест «потянуть» — иначе фоновый refetch (отмена, invalidate, интервал) даёт моргание индикатора. */
  const [myBookingsPullRefresh, setMyBookingsPullRefresh] = useState(false);
  const [mainScrollViewportH, setMainScrollViewportH] = useState(0);
  const [mainScrollContentH, setMainScrollContentH] = useState(0);
  const { height: windowHeight } = useWindowDimensions();

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
      setPartySize(clampParty(p.defaultPartySize));
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
    setSelectedPcs([]);
    if (!pendingPrefill.pcName?.trim()) {
      setPendingPrefill(null);
    }
  }, [pendingPrefill, cafesQ.data]);

  useEffect(() => {
    if (!prefsLoaded) return;
    if (partyBoot.current) {
      partyBoot.current = false;
      return;
    }
    const id = setTimeout(() => {
      void patchAppPreferences({ defaultPartySize: clampParty(partySize) });
    }, 500);
    return () => clearTimeout(id);
  }, [partySize, prefsLoaded]);

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

  const onAddBookingToCalendar = useCallback(async () => {
    if (!cafe || !successPcLine) return;
    const pcLine = successPcLine;
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
    setSuccessPcLine(null);
    setSuccessOpen(false);
    if (eventId) {
      Alert.alert('', t('booking.calendarDone'));
      return;
    }
    const perm = await getCalendarPermissionsAsyncSafe();
    Alert.alert(
      '',
      !perm ? t('booking.calendarFail') : perm.status !== 'granted' ? t('booking.calendarDenied') : t('booking.calendarFail'),
    );
  }, [cafe, successPcLine, dateStart, timeStart, minsNum, t]);

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
          ? presetDurationWheelLabel(e.mins, t, locale, pricesList, products, effectivePackageZone)
          : productWheelLineLabel(e.product, locale, t, pricesList, products),
      ),
    [durationWheelEntries, locale, t, pricesList, products, effectivePackageZone],
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

  useEffect(() => {
    setSelectedPcs((prev) => prev.slice(0, partySize));
  }, [partySize]);

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
      let cancelled = false;
      const id = setTimeout(() => {
        if (cancelled) return;
        if (user?.memberAccount) {
          void qc.refetchQueries({ queryKey: queryKeys.books(user.memberAccount) });
        }
        if (cafe && memberProfileReady && minsNum > 0) {
          void qc.invalidateQueries({ queryKey: availKey });
          void qc.invalidateQueries({ queryKey: queryKeys.cafeBookings(cafe.icafe_id) });
        }
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(id);
      };
    }, [qc, availKey, cafe, memberProfileReady, minsNum, user?.memberAccount]),
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
    enabled: !!cafe && memberProfileReady && minsNum > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: isFocused ? PC_REFETCH_INTERVAL_MS : false,
  });

  /** «Занят сейчас»: iCafe `member_pcs` → fallback `GET .../pcs` — не используется для доступности слота. */
  const livePcsQuery = useLivePcsQuery(cafe?.icafe_id, !!cafe && memberProfileReady && isFocused);

  const booksQ = useMemberBooksQuery(user?.memberAccount);
  const hasMemberBookingHistory = useMemo(() => hasAnyMemberBookingRows(booksQ.data), [booksQ.data]);
  const cafeBooksQ = useCafeBookingsQuery(cafe?.icafe_id, !!cafe && memberProfileReady);
  /** Пока не подтянули брони клуба (все участники), нельзя честно отметить места с пересечением по слоту. */
  const cafeBookingsOverlapLoading = !!(cafe && memberProfileReady && cafeBooksQ.isPending);
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
    if (!timeSlots.includes(timeStart) && timeSlots.length) {
      setTimeStart(timeSlots[0]);
    }
  }, [effectiveDateForTimeSlots, timeSlots, timeStart]);

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
    enabled: Boolean(cafe && user?.memberId && memberProfileReady && isFocused),
    staleTime: 15_000,
    refetchInterval: 28_000,
  });

  const pcs = pcsQuery.data?.pc_list ?? null;

  const pcsForUi = useMemo(() => {
    if (!pcs) return null;
    if (bookingMapZoneFilter.mode === 'any') return pcs;
    return pcs.filter((p) => pcMatchesNearestZoneFilter(p, bookingMapZoneFilter));
  }, [pcs, bookingMapZoneFilter]);

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
    pcs,
    pcsQuery.isFetching,
    planIv,
    bookingNowMs,
    planOverlapBusyPcsLower,
  ]);

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
      pcTierFilterReady &&
      !cafeBookingsOverlapLoading,
    [
      cafe,
      memberProfileReady,
      dateFilterCommitted,
      timeAndDurationReady,
      pcTierFilterReady,
      cafeBookingsOverlapLoading,
    ],
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

  const nearestSearchZoneReady =
    nearestSearchPcZone === 'any' || nearestSearchPcZoneCommitted;

  const alertSelectPcBlockedIfNeeded = useCallback(() => {
    if (!cafe) {
      Alert.alert(t('booking.alertPc'), t('booking.selectPcBlockedNeedClub'));
      return;
    }
    if (!memberProfileReady) {
      Alert.alert(t('booking.alertPc'), t('booking.selectPcBlockedNeedProfile'));
      return;
    }
    if (cafeBookingsOverlapLoading) {
      Alert.alert(t('booking.alertPc'), t('booking.selectPcBlockedLoadingClubBookings'));
      return;
    }
    if (!dateFilterCommitted) {
      Alert.alert(t('booking.alertPc'), t('booking.selectPcBlockedNeedDate'));
      return;
    }
    if (!timeAndDurationReady) {
      Alert.alert(t('booking.alertPc'), t('booking.selectPcBlockedNeedTimeDuration'));
      return;
    }
  }, [cafe, memberProfileReady, cafeBookingsOverlapLoading, dateFilterCommitted, timeAndDurationReady, t]);

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

      if (partySize === 1) {
        setSelectedPcs([item]);
        return;
      }
      setSelectedPcs((prev) => {
        const i = prev.findIndex((p) => p.pc_name === item.pc_name);
        if (i >= 0) return prev.filter((_, idx) => idx !== i);
        if (prev.length >= partySize) return prev;
        if (prev.length > 0) {
          const z0 = pcPriceZoneKey(prev[0]);
          const z1 = pcPriceZoneKey(item);
          if (z0 !== z1) {
            Alert.alert(
              t('booking.alertBooking'),
              t('booking.partyZoneMismatch', {
                current: formatPublicZoneLabel(pcZoneLabel(prev[0]) || '', t),
                attempt: formatPublicZoneLabel(pcZoneLabel(item) || '', t),
              }),
            );
            return prev;
          }
        }
        return [...prev, item];
      });
    },
    [canSelectPc, alertSelectPcBlockedIfNeeded, partySize, planOverlapBusyPcsLower, planIv, bookingNowMs, t],
  );

  const onMapPcPress = useCallback(
    (pcName: string) => {
      const item = pcs?.find((p) => pcNamesLooselyEqual(p.pc_name, pcName));
      if (item) togglePcSelection(item);
    },
    [pcs, togglePcSelection],
  );

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
        onSuccess: () => void cancelVisitFeedbackReminderForRow(icafeId, row),
        onError: (err) => {
          const msg = formatPublicErrorMessage(err, t, 'booking.errorGeneric');
          Alert.alert(t('booking.errorGeneric'), msg);
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
    if (modalNearestMenu) setNearestSearchTimeAny(true);
  }, [modalNearestMenu]);

  useEffect(() => {
    if (modalBooks && user?.memberAccount) void booksQ.refetch();
  }, [modalBooks, user?.memberAccount, booksQ.refetch]);

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

  /** Ужимаем схему зала, когда сверху/снизу появляются высокие блоки — чтобы кнопки брони чаще оставались на экране без прокрутки. */
  const hallMapMinHeight = useMemo(() => {
    const base = hallMapCanonicalLayout ? 320 : 280;
    let h = base;
    let tight = false;
    if (accountOverlapBooking) {
      h -= 52;
      tight = true;
    }
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
    accountOverlapBooking,
    seatLayoutMode,
    selectedPcs.length,
    overlapWithExistingBookings,
    overlapConflict,
    windowHeight,
  ]);

  const describeNearestSlotCandidate = useCallback(
    (c: NearestWindowCandidate) => {
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
          ? pickPcsForPartyForPlan(pcsWithoutKnownOverlap, planIv, nearestZoneFilter, partySize, bookingNowMs)
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
        isBookable: picked.length >= partySize,
        serverFrame: c.data.time_frame?.trim() || '',
      };
    },
    [timeSlotOptions, minsNum, nearestZoneFilter, partySize, bookingNowMs, locale, cafeBookingRowsForOverlap, t],
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
        return await findNearestClubWindows(
          cafe,
          {
            mins: minsNum,
            priceName: priceNameForAvailability || undefined,
            partySize,
            zoneFilter: nearestZoneFilter,
            searchDayIsoMoscow: nearestSearchDayISO,
            earliestStartMoscow:
              nearestSearchTimeAny ? null : { date: effectiveDateForTimeSlots, time: timeStart },
          },
          {
            maxSlots: 5,
            bookingNowMs,
            stepAdvanceMins: slotStep,
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
        .slice(0, 5);
      setNearestSlotResults(safeCandidates);
      setNearestMenuPhase('results');
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.name === 'AbortError') return;
      const msg = formatPublicErrorMessage(e, t, 'booking.errorGeneric');
      Alert.alert(t('booking.alertBooking'), msg);
    },
  });

  const applyNearestSlotCandidate = useCallback(
    (c: NearestWindowCandidate) => {
      const { slot, picked } = describeNearestSlotCandidate(c);
      if (picked.length < partySize) {
        Alert.alert(t('booking.alertBooking'), t('booking.errorPcStale'));
        return;
      }
      setDateStart(slot.dateISO);
      setTimeStart(slot.timeStart);
      setDateFilterCommitted(true);
      setTimeDurationFilterCommitted(true);
      setSelectedPcs(picked);
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
    [qc, user?.memberId, describeNearestSlotCandidate, minsNum, partySize, t],
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
              qc.refetchQueries({ queryKey: queryKeys.books(user?.memberAccount) }),
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
        Alert.alert(t('booking.alertBooking'), result.failed[0].err);
        refreshCachesAfterBooking();
        return;
      }
      const partial = result.failed.length > 0 && result.ok.length > 0;
      if (partial) {
        Alert.alert(
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
          defaultPartySize: clampParty(partySize),
          ...(tariff ? { lastTariff: tariffToSaved(tariff) } : {}),
        });
        if (!partial) {
          setSuccessPcLine(uiPcList(result.ok));
          setSuccessOpen(true);
        }
        try {
          const prefs = await loadAppPreferences();
          const partySuffix = partySize > 1 ? t('notif.partySuffix', { n: partySize }) : '';
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
      }
      setSelectedPcs([]);
      refreshCachesAfterBooking();
    },
    onError: (e: unknown) => {
      const msg = formatPublicErrorMessage(e, t, 'booking.errorGeneric');
      Alert.alert(t('booking.alertBooking'), msg);
    },
  });

  const cafes = cafesQ.data ?? [];

  const costLabel = tariffCostLabel(tariff);
  const totalPriceRub = useMemo(() => {
    if (!tariff) return NaN;
    if (!Number.isFinite(minsNum) || minsNum <= 0) return NaN;
    if (selectedPcs.length > 0) {
      return totalBookingRub(tariff, selectedPcs, pricesList, products, minsNum);
    }
    if (tariff.kind === 'product') {
      const flat = productPackagePriceRub(tariff);
      return Number.isFinite(flat) ? flat * partySize : NaN;
    }
    if (tariff.kind === 'price') {
      if (shouldChargeViaCatalogProducts(products, minsNum)) {
        return NaN;
      }
      if (isHourlyGridDurationMins(minsNum)) {
        const rub = priceBookingRubForResolvedTier(pricesList, tariff.item, minsNum);
        return Number.isFinite(rub) ? rub * partySize : NaN;
      }
    }
    return NaN;
  }, [tariff, selectedPcs, pricesList, products, partySize, minsNum]);

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

  const bookingSelectionReady = selectedPcs.length === partySize && selectedPcs.length > 0;
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
    selectedPcs.length === partySize &&
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
    if (!canBook || selectedPcs.length !== partySize) return;
    if (accountOverlapBooking) {
      Alert.alert(t('booking.alertBooking'), t('booking.accountTimeOverlapRule'));
      return;
    }
    if (!signHintOk) {
      Alert.alert(t('booking.signTitle'), t('booking.signBody'));
      return;
    }
    if (needPay) {
      Alert.alert(t('booking.lowBalanceTitle'), t('booking.lowBalanceBody'), [
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
    ],
  );

  const timeSlotLabels = useMemo(
    () =>
      timeSlots.map((s) =>
        formatMoscowWallSlotForLocale(effectiveDateForTimeSlots, s, locale === 'en' ? 'en' : 'ru'),
      ),
    [timeSlots, effectiveDateForTimeSlots, locale],
  );

  const timeLabelsForDurationModal = useMemo(
    () =>
      timeModalForNearestSlotSearch
        ? [t('booking.nearestAny'), ...timeSlotLabels]
        : timeSlotLabels,
    [timeModalForNearestSlotSearch, timeSlotLabels, t],
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

  pendingTimeIdxRef.current = pendingTimeIdx;
  pendingDurIdxRef.current = pendingDurIdx;

  const bumpParty = (delta: number) => {
    setPartySize((s) => clampParty(s + delta));
  };

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

  const applyClubWheelSelection = (idx: number) => {
    const item = cafes[idx];
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
      const slots = timeSlotsRef.current;
      const entries = durationWheelEntriesRef.current;
      const nTime = slots.length;
      const nDur = entries.length;
      if (!cafe) return;
      if (!nTime || !nDur) {
        Alert.alert(t('booking.alertBooking'), t('booking.errorGeneric'));
        return;
      }
      const forNearest = timeModalNearestSearchRef.current;
      let tiSafe: number;
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
        Alert.alert(t('booking.alertBooking'), t('booking.errorGeneric'));
        return;
      }

      const dayForSlot = effectiveDateForTimeSlotsRef.current;
      setDateStart(dayForSlot);
      setDateFilterCommitted(true);

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
          Alert.alert(t('booking.alertBooking'), t('booking.errorGeneric'));
          return;
        }
      }

      /** После `await` замыкание могло устареть — снова читаем слот и строку колеса. */
      entry = durationWheelEntriesRef.current[diSafe];
      slot = timeSlotsRef.current[tiSafe];
      if (!slot || !entry) {
        Alert.alert(t('booking.alertBooking'), t('booking.errorGeneric'));
        return;
      }

      if (entry.kind === 'preset') {
        const tpl = pickHourlyTemplateForSessionMins(prices, entry.mins);
        if (!tpl) {
          Alert.alert(t('booking.alertBooking'), t('booking.noHourlyTier'));
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
          Alert.alert(t('booking.alertBooking'), t('booking.errorGeneric'));
          return;
        }
      }

      setTimeStart(slot);
      setTimeDurationFilterCommitted(true);
      closeTimeDurationModal();
    })();
  };

  const applyZoneWheelSelection = (idx: number) => {
    const k = ZONE_WHEEL_KEYS[Math.max(0, Math.min(ZONE_WHEEL_KEYS.length - 1, idx))];
    setNearestSearchPcZone(k);
    setNearestSearchPcZoneCommitted(true);
    setModalTariff(false);
  };

  const seatViewToggle = (
    <View style={styles.seatViewToggleRow}>
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
          contentContainerStyle={styles.scroll}
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
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>{t('booking.title')}</Text>
          <TabSettingsButton />
        </View>

        <TodaysBookingBanner />

        {accountOverlapBooking ? (
          <View style={styles.oneActiveRuleBanner}>
            <MaterialCommunityIcons name="information-outline" size={20} color={colors.accentBright} />
            <Text style={styles.oneActiveRuleText}>{t('booking.accountTimeOverlapRule')}</Text>
          </View>
        ) : null}

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
          onPress={() => {
            const i = cafe ? cafes.findIndex((c) => c.icafe_id === cafe.icafe_id) : 0;
            setPendingClubIdx(i >= 0 ? i : 0);
            setModalClub(true);
          }}
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
            setPendingDateIdx(wheelIndexForCalendarIso(dateStart, datesList));
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
            const rawTi = timeSlots.indexOf(timeStart);
            const ti = !timeAndDurationReady
              ? suggestedTimeIdx
              : rawTi >= 0
                ? rawTi
                : suggestedTimeIdx;
            setPendingTimeIdx(ti);
            setPendingDurIdx(resolvedDurationWheelIndex);
            setModalTimeDuration(true);
          }}
        />

        {cafe ? (
          <View style={styles.partyBlock}>
            <View style={styles.partyRow}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.muted} />
              <Text style={styles.partyLabel}>{t('booking.partyLabel')}</Text>
              <Pressable style={styles.partyBtn} onPress={() => bumpParty(-1)} disabled={partySize <= 1}>
                <Text style={styles.partyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.partyValue}>{partySize}</Text>
              <Pressable
                style={styles.partyBtn}
                onPress={() => bumpParty(1)}
                disabled={partySize >= 8}
              >
                <Text style={styles.partyBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {memberProfileReady ? (
          <Pressable
            style={({ pressed }) => [styles.btnGlobalSearch, pressed && styles.pressed]}
            onPress={() => {
              setNearestSlotResults([]);
              setNearestMenuPhase('form');
              setNearestSearchDayISO(null);
              setModalNearestMenu(true);
            }}
            disabled={nearestSlotsMut.isPending}
          >
            <Text style={styles.btnGlobalSearchText}>{t('booking.nearestNearestInClub')}</Text>
          </Pressable>
        ) : null}

        {cafe ? (
          <View style={styles.mapBlock} key={`map-${cafe.icafe_id}`}>
            {seatLayoutMode === 'scheme' ? (
              <>
                {seatViewToggle}
                {structQ.isError ? (
                  <QueryError
                    message={formatPublicErrorMessage(structQ.error, t, 'booking.errorGeneric')}
                    onRetry={() => void structQ.refetch()}
                    t={t}
                    styles={styles}
                    colors={colors}
                  />
                ) : structQ.isLoading || (structQ.isFetching && !structQ.data) ? (
                  <SkeletonBlock height={320} colors={colors} />
                ) : structQ.data?.rooms?.length ? (
                  <>
                    <ClubLayoutCanvas
                      rooms={structQ.data.rooms}
                      colors={colors}
                      icafeId={cafe.icafe_id}
                      zoneFilter={bookingMapZoneFilter}
                      pcAvailability={pcAvailability}
                      onPcPress={onMapPcPress}
                      minHeight={hallMapMinHeight}
                      horizontalPadding={BOOKING_SCROLL_H_PAD * 2}
                      bookingCompact
                    />
                    {selectedPcs.length > 0 ? (
                      <Pressable
                        style={({ pressed }) => [styles.occupancyBtn, styles.mapOccupancyBtn, pressed && styles.pressed]}
                        onPress={() => setModalOccupancy(true)}
                      >
                        <Text style={styles.occupancyBtnText}>{t('booking.occupancy')}</Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.hintMuted}>{t('hallMap.emptyZones')}</Text>
                )}
              </>
            ) : (
              <>
                {seatViewToggle}
                {pcsForUi
                  ? pcsForUi.map((item, index) => {
                      const sel = selectedPcs.some((s) => s.pc_name === item.pc_name);
                      const lk = String(item.pc_name).trim().toLowerCase();
                      const slotBusy =
                        planOverlapBusyPcsLower.has(lk) ||
                        (planIv ? effectivePcBusyForPlan(item, planIv, bookingNowMs) : item.is_using);
                      const busyUntil = slotBusy
                        ? busyUntilInstantForPcListItem(item, planIv, cafeBookingRowsForOverlap, bookingNowMs)
                        : null;
                      const pcStatusLine =
                        busyUntil != null
                          ? t('booking.pcStatusBusyAfter', {
                              time: formatInstantMoscowWallForLocale(busyUntil, locale),
                            })
                          : slotBusy
                            ? t('booking.pcStatusBusy')
                            : t('booking.pcStatusFree');
                      return (
                        <Pressable
                          key={`${item.pc_name}-${index}`}
                          style={[
                            styles.pcCard,
                            !canSelectPc && styles.pcCardSelectLocked,
                            slotBusy && styles.pcCardBusy,
                            sel && styles.pcCardSelected,
                          ]}
                          onPress={() => togglePcSelection(item)}
                          disabled={canSelectPc && slotBusy}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pcName}>{uiPcLabel(item.pc_name)}</Text>
                            <Text style={styles.pcSub}>
                              {formatPublicZoneLabel(pcZoneLabel(item) || '', t)} · {pcStatusLine}
                            </Text>
                          </View>
                          {sel ? (
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.pcSelected} />
                          ) : null}
                        </Pressable>
                      );
                    })
                  : null}
                {seatLayoutMode === 'list' && selectedPcs.length > 0 ? (
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
              </>
            )}
          </View>
        ) : null}

        {cafe && seatLayoutMode === 'scheme' ? (
          hallMapCanonicalLayout ? (
            <HallMapStatusLegend variant="booking" />
          ) : (
            <View style={styles.legend}>
              <LegendDot styles={styles} color={colors.pcFree} label={t('booking.legendFree')} />
              <LegendDot styles={styles} color={colors.pcBusy} label={t('booking.legendBusy')} />
              <LegendDot styles={styles} color={colors.pcLiveBusy} label={t('booking.legendLiveNow')} />
              <LegendDot styles={styles} color={colors.pcSelected} label={t('booking.legendSelected')} />
            </View>
          )
        ) : null}

        {overlapWithExistingBookings && overlapConflict ? (
          <View style={styles.overlapBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} />
            <Text style={styles.overlapBannerText}>
              {(() => {
                const { from, to } = formatIntervalClock(locale, overlapConflict.iv);
                return t('booking.overlapWarningDetail', {
                  pc: uiPcLabel(overlapConflict.pcName),
                  from,
                  to,
                });
              })()}
            </Text>
          </View>
        ) : null}

        {pcsQuery.isFetching && !pcsQuery.data ? (
          <SkeletonBlock height={200} colors={colors} style={{ marginBottom: 12 }} />
        ) : pcsQuery.isError && !pcsQuery.data ? (
          <QueryError
            message={formatPublicErrorMessage(pcsQuery.error, t, 'booking.errorGeneric')}
            onRetry={() => pcsQuery.refetch()}
            t={t}
            styles={styles}
            colors={colors}
          />
        ) : null}

        {tariff &&
        selectedPcs.length === partySize &&
        selectedPcs.length > 0 &&
        !allSelectedPcsHaveTariff ? (
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
              <Text
                style={[
                  styles.btnGreyText,
                  hasMemberBookingHistory && styles.btnMyBookingsHasHistoryText,
                ]}
              >
                {t('booking.myBookings')}
              </Text>
            </Pressable>
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
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={() => {
          nearestSearchAbortRef.current?.abort();
          setModalNearestMenu(false);
          setNearestMenuPhase('form');
        }}
      >
        <SafeAreaView style={[styles.fullSheetSafe, { paddingTop: Math.max(insets.top, 12) }]} edges={['bottom']}>
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
                  style={({ pressed }) => [styles.sheetHeaderClosePressable, pressed && styles.pressed]}
                  onPress={() => {
                    nearestSearchAbortRef.current?.abort();
                    setModalNearestMenu(false);
                    setNearestMenuPhase('form');
                  }}
                >
                  <Text style={styles.sheetHeaderClose}>{t('booking.close')}</Text>
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
              <View style={styles.sheetHeaderRow}>
                <Text style={[styles.sheetTitle, { flex: 1 }]}>{t('booking.findNearestWindow')}</Text>
                <Pressable
                  style={({ pressed }) => [styles.sheetHeaderClosePressable, pressed && styles.pressed]}
                  onPress={() => {
                    nearestSearchAbortRef.current?.abort();
                    setModalNearestMenu(false);
                    setNearestMenuPhase('form');
                  }}
                >
                  <Text style={styles.sheetHeaderClose}>{t('booking.close')}</Text>
                </Pressable>
              </View>
              {t('booking.nearestMenuHint').trim() ? (
                <Text style={styles.nearestMenuHint}>{t('booking.nearestMenuHint')}</Text>
              ) : null}
              <ScrollView style={styles.modalScrollFlex} keyboardShouldPersistTaps="handled">
                <BookingWheelFilterRow
                  styles={styles}
                  colors={colors}
                  icon="map-marker-outline"
                  emptyHint={t('booking.filterSelectClub')}
                  titleFilled={t('booking.filterTitleClub')}
                  subtitle={cafe?.address ?? ''}
                  hasValue={!!cafe}
                  disabled={false}
                  onPress={() => {
                    const i = cafe ? cafes.findIndex((x) => x.icafe_id === cafe.icafe_id) : 0;
                    setPendingClubIdx(i >= 0 ? i : 0);
                    setModalClub(true);
                  }}
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
                    setPendingNearestDayIdx(
                      Math.min(Math.max(0, idx), Math.max(0, nearestSearchDayLabels.length - 1)),
                    );
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
                    setDateStart(effectiveDateForTimeSlots);
                    setDateFilterCommitted(true);
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
                    setModalTariff(true);
                  }}
                />

                {cafe ? (
                  <View style={styles.partyBlock}>
                    <View style={styles.partyRow}>
                      <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.muted} />
                      <Text style={styles.partyLabel}>{t('booking.partyLabel')}</Text>
                      <Pressable style={styles.partyBtn} onPress={() => bumpParty(-1)} disabled={partySize <= 1}>
                        <Text style={styles.partyBtnText}>−</Text>
                      </Pressable>
                      <Text style={styles.partyValue}>{partySize}</Text>
                      <Pressable
                        style={styles.partyBtn}
                        onPress={() => bumpParty(1)}
                        disabled={partySize >= 8}
                      >
                        <Text style={styles.partyBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

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
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <Text style={styles.btnGlobalSearchText}>{t('booking.nearestRunSearch')}</Text>
                  )}
                </Pressable>
                {cafe && pricesQ.isLoading ? (
                  <Text style={styles.nearestMenuEmpty}>{t('booking.nearestWaitPrices')}</Text>
                ) : null}
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={modalClub}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={() => setModalClub(false)}
      >
        <View style={styles.sheetModalRoot}>
          <Pressable style={styles.sheetModalSpacer} onPress={() => setModalClub(false)} />
          <DraggableWheelSheet
            open={modalClub}
            onRequestClose={() => setModalClub(false)}
            colors={colors}
            sheetStyle={styles.sheet}
          >
            <Text style={styles.sheetTitle}>{t('booking.sheetWheelClub')}</Text>
            {cafesQ.isLoading ? (
              <SkeletonBlock height={120} colors={colors} />
            ) : cafesQ.isError ? (
              <QueryError
                message={formatPublicErrorMessage(cafesQ.error, t, 'booking.errorGeneric')}
                onRetry={() => cafesQ.refetch()}
                t={t}
                styles={styles}
                colors={colors}
              />
            ) : cafes.length === 0 ? (
              <Text style={styles.emptyList}>{t('cafes.empty')}</Text>
            ) : (
              <WheelPickerColumn
                ref={clubWheelRef}
                active={modalClub}
                data={cafes.map((c) => c.address)}
                valueIndex={pendingClubIdx}
                onChangeIndex={setPendingClubIdx}
                colors={colors}
                onItemPress={applyClubWheelSelection}
              />
            )}
            <Pressable
              style={styles.wheelSheetDone}
              onPress={() => applyClubWheelSelection(clubWheelRef.current?.getCenterIndex() ?? pendingClubIdx)}
            >
              <Text style={styles.wheelSheetDoneText}>{t('booking.done')}</Text>
            </Pressable>
          </DraggableWheelSheet>
        </View>
      </Modal>

      <Modal
        visible={modalDate}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={() => setModalDate(false)}
      >
        <View style={styles.sheetModalRoot}>
          <Pressable style={styles.sheetModalSpacer} onPress={() => setModalDate(false)} />
          <DraggableWheelSheet
            open={modalDate}
            onRequestClose={() => setModalDate(false)}
            colors={colors}
            sheetStyle={styles.sheet}
          >
            <Text style={styles.sheetTitle}>{t('booking.sheetWheelDate')}</Text>
            <WheelPickerColumn
              ref={dateWheelRef}
              active={modalDate}
              data={dateListLabels}
              valueIndex={pendingDateIdx}
              onChangeIndex={setPendingDateIdx}
              colors={colors}
              onItemPress={applyDateWheelSelection}
            />
            <Pressable
              style={styles.wheelSheetDone}
              onPress={() => applyDateWheelSelection(dateWheelRef.current?.getCenterIndex() ?? pendingDateIdx)}
            >
              <Text style={styles.wheelSheetDoneText}>{t('booking.done')}</Text>
            </Pressable>
          </DraggableWheelSheet>
        </View>
      </Modal>

      <Modal
        visible={modalTimeDuration}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={closeTimeDurationModal}
      >
        <View style={styles.sheetModalRoot}>
          <Pressable style={styles.sheetModalSpacer} onPress={closeTimeDurationModal} />
          <DraggableWheelSheet
            open={modalTimeDuration}
            onRequestClose={closeTimeDurationModal}
            colors={colors}
            sheetStyle={styles.sheet}
          >
            <Text style={styles.sheetTitle}>{t('booking.sheetWheelTimeDuration')}</Text>
            {pricesQ.isLoading ? <ActivityIndicator color={colors.accentBright} style={{ marginVertical: 12 }} /> : null}
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
                  onChangeIndex={setPendingTimeIdx}
                  colors={colors}
                  onItemPress={(i) =>
                    applyTimeDurationWheelSelection(
                      i,
                      durWheelRef.current?.getCenterIndex() ?? pendingDurIdxRef.current,
                    )
                  }
                />
              </View>
              <View style={styles.wheelDualCol}>
                <WheelPickerColumn
                  ref={durWheelRef}
                  active={modalTimeDuration}
                  data={durationWheelItems}
                  valueIndex={pendingDurIdx}
                  onChangeIndex={setPendingDurIdx}
                  colors={colors}
                  onItemPress={(j) =>
                    applyTimeDurationWheelSelection(
                      timeWheelRef.current?.getCenterIndex() ?? pendingTimeIdxRef.current,
                      j,
                    )
                  }
                />
              </View>
            </View>
            {!pricesQ.isLoading && !products.length && !pricesList.length ? (
              <Text style={styles.emptyList}>{t('booking.noPackages')}</Text>
            ) : null}
            <Pressable
              style={styles.wheelSheetDone}
              onPress={() => {
                /**
                 * Нельзя вызывать `snapToNearestAndNotify` на обоих колёсах подряд: `scrollToOffset` на одном
                 * FlatList на части устройств сбрасывает offset соседа → второй snap даёт неверный индекс.
                 * Берём центр из ref до любого скролла; при необходимости доводку делает сам `apply`.
                 */
                const nT = timeLabelsForDurationModal.length;
                const nD = durationWheelItems.length;
                const tiRaw = timeWheelRef.current?.getCenterIndex() ?? pendingTimeIdx;
                const diRaw = durWheelRef.current?.getCenterIndex() ?? pendingDurIdx;
                const ti = nT <= 0 ? 0 : Math.max(0, Math.min(nT - 1, tiRaw));
                const di = nD <= 0 ? 0 : Math.max(0, Math.min(nD - 1, diRaw));
                applyTimeDurationWheelSelection(ti, di);
              }}
            >
              <Text style={styles.wheelSheetDoneText}>{t('booking.done')}</Text>
            </Pressable>
          </DraggableWheelSheet>
        </View>
      </Modal>

      <Modal
        visible={modalTariff}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={() => setModalTariff(false)}
      >
        <View style={styles.sheetModalRoot}>
          <Pressable style={styles.sheetModalSpacer} onPress={() => setModalTariff(false)} />
          <DraggableWheelSheet
            open={modalTariff}
            onRequestClose={() => setModalTariff(false)}
            colors={colors}
            sheetStyle={styles.sheet}
          >
            {pricesQ.isLoading ? <ActivityIndicator color={colors.accentBright} style={{ marginVertical: 16 }} /> : null}
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
                    onChangeIndex={setPendingZoneIdx}
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
              onPress={() => applyZoneWheelSelection(zoneWheelRef.current?.getCenterIndex() ?? pendingZoneIdx)}
            >
              <Text style={styles.wheelSheetDoneText}>{t('booking.done')}</Text>
            </Pressable>
          </DraggableWheelSheet>
        </View>
      </Modal>

      <Modal
        visible={modalTermsPrices}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={() => setModalTermsPrices(false)}
      >
        <SafeAreaView style={[styles.fullSheetSafe, { paddingTop: Math.max(insets.top, 12) }]} edges={['bottom']}>
          <Text style={styles.sheetTitle}>{t('booking.nearestTariffRowSubtitle')}</Text>
          {cafe ? (
            <Text style={[styles.muted, { marginBottom: 12 }]}>{cafe.address}</Text>
          ) : (
            <Text style={[styles.muted, { marginBottom: 12 }]}>{t('booking.pricesNeedClub')}</Text>
          )}
          {cafe && pricesQ.isLoading ? (
            <ActivityIndicator color={colors.accentBright} style={{ marginVertical: 20 }} />
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
            <ScrollView style={styles.modalScrollFlex} keyboardShouldPersistTaps="handled">
              {pricesList.length > 0 ? (
                <>
                  <Text style={styles.subSheetTitle}>{t('booking.hourlySection')}</Text>
                  {pricesList.map((p, i) => (
                    <Text
                      key={`terms-price-${p.price_id}-${String(p.group_name ?? '')}-${String(p.duration ?? '')}-${i}`}
                      style={[styles.muted, { fontSize: 15, lineHeight: 22, marginBottom: 10 }]}
                    >
                      {priceHourlyStepLabel(p)}
                    </Text>
                  ))}
                </>
              ) : null}
              {products.length > 0 ? (
                <>
                  <Text style={[styles.subSheetTitle, pricesList.length > 0 ? { marginTop: 8 } : null]}>
                    {t('booking.packagesSection')}
                  </Text>
                  {products.map((p, i) => (
                    <Text
                      key={`terms-prod-${p.product_id}-${i}`}
                      style={[styles.muted, { fontSize: 15, lineHeight: 22, marginBottom: 10 }]}
                    >
                      {productTierLabel(p)}
                    </Text>
                  ))}
                </>
              ) : null}
            </ScrollView>
          ) : null}
          <Pressable style={styles.sheetDone} onPress={() => setModalTermsPrices(false)}>
            <Text style={styles.sheetDoneText}>{t('booking.close')}</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={modalNearestDay}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={() => setModalNearestDay(false)}
      >
        <View style={styles.sheetModalRoot}>
          <Pressable style={styles.sheetModalSpacer} onPress={() => setModalNearestDay(false)} />
          <DraggableWheelSheet
            open={modalNearestDay}
            onRequestClose={() => setModalNearestDay(false)}
            colors={colors}
            sheetStyle={styles.sheet}
          >
            <Text style={styles.sheetTitle}>{t('booking.sheetWheelNearestDay')}</Text>
            <WheelPickerColumn
              ref={nearestDayWheelRef}
              active={modalNearestDay}
              data={nearestSearchDayLabels}
              valueIndex={pendingNearestDayIdx}
              onChangeIndex={setPendingNearestDayIdx}
              colors={colors}
              onItemPress={applyNearestDayWheelSelection}
            />
            <Pressable
              style={styles.wheelSheetDone}
              onPress={() =>
                applyNearestDayWheelSelection(
                  nearestDayWheelRef.current?.getCenterIndex() ?? pendingNearestDayIdx,
                )
              }
            >
              <Text style={styles.wheelSheetDoneText}>{t('booking.done')}</Text>
            </Pressable>
          </DraggableWheelSheet>
        </View>
      </Modal>

      <Modal
        visible={modalOccupancy}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={() => setModalOccupancy(false)}
      >
        <SafeAreaView style={[styles.fullSheetSafe, { paddingTop: Math.max(insets.top, 12) }]} edges={['bottom']}>
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
            <SkeletonBlock height={80} colors={colors} style={{ marginVertical: 12 }} />
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
      </Modal>

      <Modal
        visible={modalBooks}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={() => setModalBooks(false)}
      >
        <SafeAreaView style={[styles.fullSheetSafe, { paddingTop: Math.max(insets.top, 12) }]} edges={['bottom']}>
          <Text style={styles.sheetTitle}>{t('booking.myBookingsTitle')}</Text>
          <Text style={styles.myBookingsHint}>{t('booking.myBookingsHint')}</Text>
          {booksQ.isLoading ? (
            <SkeletonBlock height={160} colors={colors} style={{ marginVertical: 16 }} />
          ) : booksQ.isError ? (
            <QueryError
              message={formatPublicErrorMessage(booksQ.error, t, 'booking.booksLoadError')}
              onRetry={() => booksQ.refetch()}
              t={t}
              styles={styles}
              colors={colors}
            />
          ) : booksQ.data && hasAnyMemberBookingRows(booksQ.data) ? (
            <ScrollView
              style={styles.modalScrollFlex}
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
                );
                const activeRows = rows.filter(
                  (r) => bookingRowLifecycleStatus(r, bookingNowMs) !== 'ended',
                );
                const historyRows = rows.filter(
                  (r) => bookingRowLifecycleStatus(r, bookingNowMs) === 'ended',
                );
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
            <Text style={styles.muted}>{t('booking.noData')}</Text>
          )}
          <Pressable style={styles.sheetDone} onPress={() => setModalBooks(false)}>
            <Text style={styles.sheetDoneText}>{t('booking.close')}</Text>
          </Pressable>
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
        </SafeAreaView>
      </Modal>

      <Modal visible={successOpen} animationType="fade" transparent onRequestClose={() => setSuccessOpen(false)}>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>{t('booking.successTitle')}</Text>
            <Text style={styles.successDescr}>
              {successPcLine && successPcLine.includes(',')
                ? t('booking.successTextMany', { pcs: successPcLine })
                : partySize > 1
                  ? `${t('booking.successText')} ${t('booking.successParty', { n: partySize })}`
                  : t('booking.successText')}
            </Text>
            <Pressable
              style={styles.successBtnSecondary}
              onPress={() => void onAddBookingToCalendar()}
              accessibilityRole="button"
            >
              <Text style={styles.successBtnSecondaryText}>{t('booking.addToCalendar')}</Text>
            </Pressable>
            <Pressable
              style={styles.successBtn}
              onPress={() => {
                setSuccessPcLine(null);
                setSuccessOpen(false);
              }}
            >
              <Text style={styles.successBtnText}>{t('booking.successOk')}</Text>
            </Pressable>
          </View>
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
): React.ReactNode {
  if (!tariff) return `${timePart} · ${t('booking.durationNotChosen')}`;
  if (tariff.kind === 'product') {
    const duration = formatBookingDurationHuman(bookingPackageWheelDisplayMins(tariff.item, minsNum), locale);
    if (!duration) {
      return `${timePart} · ${t('booking.packageWheelNoDuration', { line: productTierLabel(tariff.item) })}`;
    }
    const line1 = t('booking.packageWheelLine1', { duration });
    const pct =
      pricesList.length || productsCatalog.length
        ? packageSavingPercentForWheel(tariff.item, pricesList, productsCatalog)
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
      pricesList.length || productsCatalog.length
        ? packageSavingPercentForPresetPackageMinutes(minsNum, pricesList, productsCatalog, packageZone)
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
          size={20}
          color={disabled ? colors.muted : hasValue ? colors.accentBright : colors.muted}
          style={styles.choiceIcon}
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
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
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

function LegendDot({ styles, color, label }: { styles: BookingStyles; color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
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

function createBookingStyles(colors: ColorPalette, theme: ThemeName) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    bookingMainColumn: { flex: 1 },
    bookingScrollFlex: { flex: 1 },
    /** Кнопки брони и «Условия» вне ScrollView — всегда над таб-баром. */
    bookingFooter: {
      paddingHorizontal: BOOKING_SCROLL_H_PAD,
      paddingTop: 10,
      backgroundColor: colors.bg,
    },
    scroll: { paddingHorizontal: BOOKING_SCROLL_H_PAD, paddingTop: 8, paddingBottom: 16 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 12,
    },
    screenTitle: {
      flex: 1,
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'left',
    },
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
      backgroundColor: colors.zoneBg,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nearestMenuFindBtnDisabled: {
      opacity: 0.42,
    },
    nearestMenuEmpty: {
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
    mapBlock: { marginBottom: 8, overflow: 'hidden' },
    seatViewToggleRow: {
      flexDirection: 'row',
      marginBottom: 6,
      backgroundColor: colors.zoneBg,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
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
      marginBottom: 8,
      paddingVertical: 6,
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
    },
    pcCardBusy: { opacity: 0.55 },
    pcCardSelectLocked: { opacity: 0.42 },
    pcCardSelected: { borderColor: colors.pcSelected, backgroundColor: colors.chipOn },
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
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 52,
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
    termsLinkText: { color: colors.muted, fontSize: 15 },
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
    /** Без затемнения экрана; тап по пустой зоне всё ещё закрывает шторку */
    sheetModalSpacer: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    filterWheelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginBottom: 10,
      height: FILTER_WHEEL_ROW_HEIGHT,
    },
    filterWheelRowIconWrap: { width: 24, alignItems: 'center', justifyContent: 'center' },
    filterWheelRowDisabled: { opacity: 0.42 },
    /** У карточки фиксированная высота; в filled-состоянии показываем компактную вторую строку. */
    filterWheelTextBlock: { flex: 1, justifyContent: 'center', minWidth: 0 },
    filterWheelSubtitleSlot: {
      marginTop: 1,
      height: FILTER_WHEEL_SUBTITLE_SLOT_HEIGHT,
      justifyContent: 'center',
    },
    filterWheelSubtitleRichClamp: { maxHeight: FILTER_WHEEL_SUBTITLE_SLOT_HEIGHT, overflow: 'hidden' },
    filterWheelEmpty: { fontSize: 15, fontWeight: '600', color: colors.muted, lineHeight: 18 },
    filterWheelTitleAccent: { fontSize: 15, fontWeight: '600', color: colors.accentBright, lineHeight: 18 },
    filterWheelSubtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 16,
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
      alignItems: 'center',
    },
    wheelSheetDoneText: {
      color: colors.accentTextOnButton,
      fontWeight: '700',
      fontSize: 16,
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
    oneActiveRuleBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 6,
      backgroundColor: colors.accentDim,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    oneActiveRuleText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '600' },
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
