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
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookingFlowApi, cafesApi } from '../../api/endpoints';
import { fetchMemberPcSessionInfo, type MemberPcSessionInfo } from '../../api/memberPcStatusApi';
import { ApiError } from '../../api/client';
import type { CafeItem, MemberBookingRow, PcListItem, PriceItem, ProductItem } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { buildTopUpUrlWithSession, getTopUpUrl } from '../../config/topUpUrl';
import { useLocale } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/messagesRu';
import {
  addCalendarDaysMoscow,
  formatISODateMoscow,
  formatInstantMoscowWallForLocale,
  formatMoscowCalendarDayLong,
  formatMoscowCalendarDayShort,
} from '../../datetime/mskTime';
import { nowForBookingCompareMs } from '../../datetime/serverBookingClock';

/** Почасовая бронь: до 2 ч фиксированными шагами; далее в модалке — только пакеты. */
const HOURLY_DURATION_PRESETS_MIN: readonly number[] = [30, 60, 90, 120];

function hourlyPresetLineLabel(
  m: number,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  if (m === 30) return t('booking.durationMinutes', { n: 30 });
  if (m === 60) return t('profile.hoursValue', { n: 1 });
  if (m === 90) return t('booking.duration1h30');
  if (m === 120) return t('profile.hoursValue', { n: 2 });
  return t('booking.durationMinutes', { n: m });
}
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { FirstHintBanner } from '../../hints/FirstHintBanner';
import { bookingSignReady, getBookingKeyMode } from '../../config/bookingSignConfig';
import { getContestSignSecret } from '../../config/contestSignSecret';
import { getHallMapAxisScaleForClub, getHallMapOffsetsForClub } from '../../config/clubLayoutConfig';
import { ClubLayoutCanvas } from '../cafes/ClubLayoutCanvas';
import type { PcAvailabilityState } from '../cafes/clubLayoutGeometry';
import { addBookingEventToCalendar } from '../../calendar/deviceCalendar';
import { scheduleBookingRemindersFromPrefs } from '../../notifications/bookingReminders';
import { clampParty, loadAppPreferences, patchAppPreferences } from '../../preferences/appPreferences';
import { queryKeys } from '../../query/queryKeys';
import { SkeletonBlock } from '../ui/SkeletonBlock';
import { TabSettingsButton } from '../../components/TabSettingsButton';
import type { BookingPrefillParams, MainTabParamList } from '../../navigation/types';
import { TodaysBookingBanner } from './TodaysBookingBanner';
import { useLivePcsQuery } from './useLivePcsQuery';
import { useMemberBooksQuery } from './useMemberBooksQuery';
import { useCafeBookingsQuery } from './useCafeBookingsQuery';
import {
  bookingRowLifecycleStatus,
  busyUntilInstantForPcListItem,
  canCancelMemberBookingRow,
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
} from './bookingTimeUtils';
import { buildBookingTimeSlots, snapWindowToBookableSlot } from './bookingTimeSlots';
import {
  findNearestClubWindows,
  pickPcsForPartyForPlan,
  type NearestWindowCandidate,
} from './nearestWindowSearch';
import type { NearestZoneFilter } from './nearestZoneFilter';
import {
  bookingMinsAfterTariffSelect,
  matchPriceTierToMinutes,
  parseMinsFromPriceItem,
  parseMinsFromProduct,
  pickHourlyTemplateForSessionMins,
  priceCostLabel,
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
  hourlyRubPerHourRangeForSession,
  pcPriceZoneKey,
  pcZoneLabel,
  productPackagePriceRub,
  resolveTariffForPc,
  tariffRatePerMinuteRub,
  totalBookingRub,
} from './zoneTariffResolve';
import { pcNamesLooselyEqual } from './pcNameMatch';

const PC_REFETCH_INTERVAL_MS = 60_000;
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
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createBookingStyles(colors), [colors]);
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
  const [modalTime, setModalDateTime] = useState(false);
  const [modalDuration, setModalDuration] = useState(false);
  const [modalTariff, setModalTariff] = useState(false);
  const [modalBooks, setModalBooks] = useState(false);
  const [modalNearestSlots, setModalNearestSlots] = useState(false);
  const [nearestSlotResults, setNearestSlotResults] = useState<NearestWindowCandidate[]>([]);

  /** Тип ПК для автоподбора ближайшего окна (не смешивает зоны для компании — см. pickPcsForPartyForPlan). */
  const [autopickZone, setAutopickZone] = useState<'any' | 'VIP' | 'BootCamp' | 'GameZone'>('any');
  const nearestZoneFilter: NearestZoneFilter = useMemo(
    () => (autopickZone === 'any' ? { mode: 'any' } : { mode: 'kinds', kinds: [autopickZone] }),
    [autopickZone],
  );
  const [modalOccupancy, setModalOccupancy] = useState(false);
  const [occupancyDayISO, setOccupancyDayISO] = useState(() =>
    formatISODateMoscow(new Date(nowForBookingCompareMs())),
  );
  const [pendingPrefill, setPendingPrefill] = useState<BookingPrefillParams | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successPcLine, setSuccessPcLine] = useState<string | null>(null);
  const [cancellingBookKey, setCancellingBookKey] = useState<string | null>(null);

  const formatDateHuman = (iso: string) => formatMoscowCalendarDayLong(iso, locale === 'en' ? 'en' : 'ru');

  const cafesQ = useQuery({
    queryKey: queryKeys.cafes(),
    queryFn: () => cafesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

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
    setMins(String(pendingPrefill.mins));
    setSelectedPcs([]);
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
      notes: `PC: ${pcLine}\n${dateStart} ${timeStart} · ${minsNum} min`,
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
    const { status } = await Calendar.getCalendarPermissionsAsync();
    Alert.alert('', status !== 'granted' ? t('booking.calendarDenied') : t('booking.calendarFail'));
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

  const products = pricesQ.data?.products ?? [];
  const pricesList = pricesQ.data?.prices ?? [];

  /** В `/available-pcs-for-booking` параметр `priceName` — от почасовой строки (`price_name`), не от пакета (`product_name`). */
  const priceNameForAvailability = useMemo(
    () => (tariff?.kind === 'price' ? priceName.trim() : ''),
    [tariff?.kind, priceName],
  );

  const slotStep = useMemo(() => {
    const raw = pricesQ.data?.step_start_booking;
    let n =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? parseFloat(String(raw).replace(',', '.'))
          : NaN;
    if (!Number.isFinite(n) || n <= 0) n = 30;
    return Math.min(120, Math.max(1, Math.floor(n)));
  }, [pricesQ.data?.step_start_booking]);
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

  const timeSlots = useMemo(
    () => buildBookingTimeSlots(dateStart, timeSlotOptions),
    [dateStart, timeSlotOptions],
  );

  useEffect(() => {
    if (!timeSlots.includes(timeStart) && timeSlots.length) {
      setTimeStart(timeSlots[0]);
    }
  }, [dateStart, timeSlots, timeStart]);

  /** До 2 ч — 30 / 60 / 90 / 120 мин; строка почасового тарифа подбирается с сервера под выбранные минуты. */
  const hourlyPresetMins = HOURLY_DURATION_PRESETS_MIN;

  const defaultSessionMins = useMemo(() => {
    if (!pricesList.length && products.length > 0) return parseMinsFromProduct(products[0], 60);
    return 60;
  }, [pricesList.length, products]);

  const hourlyTariffGroups = useMemo(() => {
    const m = new Map<string, PriceItem[]>();
    for (const p of pricesList) {
      const key = `${String(p.price_name ?? '').trim()}|${String(p.group_name ?? '').trim()}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    return Array.from(m.entries());
  }, [pricesList]);

  useEffect(() => {
    if (!cafe || !prefsLoaded) return;
    if (!products.length && !pricesList.length) {
      setTariff(null);
      setPriceName('');
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
          : products[0]
            ? { kind: 'product', item: products[0] }
            : pricesList[0]
              ? { kind: 'price', item: pricesList[0] }
              : null);
      if (pick) {
        setTariff(pick);
        setPriceName(tariffNameForApi(pick));
        setMins(bookingMinsAfterTariffSelect(pick, String(defaultSessionMins)));
      }
    });
  }, [cafe, dateStart, prefsLoaded, products, pricesList, defaultSessionMins]);

  useEffect(() => {
    if (!products.length && !pricesList.length) {
      setTariff(null);
      setPriceName('');
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
        : products[0]
          ? { kind: 'product', item: products[0] }
          : pricesList[0]
            ? { kind: 'price', item: pricesList[0] }
            : null;
      if (first) {
        setPriceName(tariffNameForApi(first));
        setMins(bookingMinsAfterTariffSelect(first, String(defaultSessionMins)));
      }
      return first;
    });
  }, [products, pricesList, defaultSessionMins]);

  useEffect(() => {
    setSelectedPcs((prev) => prev.slice(0, partySize));
  }, [partySize]);

  const structQ = useQuery({
    queryKey: queryKeys.structRooms(cafe?.icafe_id ?? 0),
    queryFn: () => bookingFlowApi.structRooms(cafe!.icafe_id),
    enabled: !!cafe,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: 'always',
  });

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
      if (user?.memberAccount) {
        void qc.refetchQueries({ queryKey: queryKeys.books(user.memberAccount) });
      }
      if (cafe && memberProfileReady && minsNum > 0) {
        void qc.invalidateQueries({ queryKey: availKey });
        void qc.invalidateQueries({ queryKey: queryKeys.cafeBookings(cafe.icafe_id) });
      }
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
  const cafeBooksQ = useCafeBookingsQuery(cafe?.icafe_id, !!cafe && memberProfileReady);
  const bookingNowMs = useBookingNowMs();

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

  const cancelBookingMut = useCancelBookingMutation();

  const sessionQ = useQuery<MemberPcSessionInfo, Error>({
    queryKey: ['member-pc-session', cafe?.icafe_id, user?.memberId],
    queryFn: () => fetchMemberPcSessionInfo(cafe!.icafe_id, user!.memberId),
    enabled: Boolean(cafe && user?.memberId && memberProfileReady && isFocused),
    staleTime: 15_000,
    refetchInterval: 28_000,
  });

  const pcs = pcsQuery.data?.pc_list ?? null;

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
    const m = pcs.find((x) => {
      if (!pcNamesLooselyEqual(x.pc_name, pendingPrefill!.pcName)) return false;
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
  }, [pendingPrefill, pcs, pcsQuery.isFetching, planIv, bookingNowMs]);

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

  const pcAvailability = useMemo(() => {
    const map: Record<string, PcAvailabilityState> = {};
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
      if (planIv && slot && pcListItemBlocksPlannedSlot(slot, planIv, bookingNowMs)) {
        map[pcName] = 'busy';
        continue;
      }
      if (liveUsingByLower.get(lk)) {
        map[pcName] = 'liveBusy';
        continue;
      }
      if (slot && !(planIv ? pcListItemBlocksPlannedSlot(slot, planIv, bookingNowMs) : slot.is_using)) {
        map[pcName] = 'free';
        continue;
      }
      map[pcName] = 'unknown';
    }
    return map;
  }, [allMapPcNames, slotByLower, liveUsingByLower, selectedPcs, planOverlapBusyPcsLower, planIv, bookingNowMs]);

  const togglePcSelection = useCallback(
    (item: PcListItem) => {
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
                current: pcZoneLabel(prev[0]) || '—',
                attempt: pcZoneLabel(item) || '—',
              }),
            );
            return prev;
          }
        }
        return [...prev, item];
      });
    },
    [partySize, planOverlapBusyPcsLower, planIv, bookingNowMs, t],
  );

  const onMapPcPress = useCallback(
    (pcName: string) => {
      const item = pcs?.find((p) => pcNamesLooselyEqual(p.pc_name, pcName));
      if (item) togglePcSelection(item);
    },
    [pcs, togglePcSelection],
  );

  const confirmCancelMemberBooking = useCallback(
    (row: MemberBookingRow, icafeIdStr: string) => {
      Alert.alert(t('booking.cancelBookingTitle'), t('booking.cancelBookingBody'), [
        { text: t('booking.cancelBookingDismiss'), style: 'cancel' },
        {
          text: t('booking.cancelBookingConfirm'),
          style: 'destructive',
          onPress: () => {
            const offerId = memberOfferIdForApi(row);
            const icafeId = Number(icafeIdStr);
            const key = memberBookingRowStableKey(icafeIdStr, row);
            setCancellingBookKey(key);
            cancelBookingMut.mutate(
              { icafeId, pcName: row.product_pc_name, memberOfferId: offerId },
              {
                onSettled: () => setCancellingBookKey(null),
                onError: (err) => {
                  const msg = err instanceof ApiError ? err.message : t('booking.errorGeneric');
                  Alert.alert(t('booking.errorGeneric'), msg);
                },
              },
            );
          },
        },
      ]);
    },
    [cancelBookingMut, t],
  );

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

  const accountOverlapBooking = useMemo(() => {
    const plan = plannedInterval(dateStart, timeStart, minsNum);
    if (!plan || !booksQ.data) return null;
    return findOverlappingOutstandingBooking(booksQ.data, plan, bookingNowMs);
  }, [booksQ.data, dateStart, timeStart, minsNum, bookingNowMs]);

  const nearestSlotsMut = useMutation({
    mutationFn: async () => {
      if (!cafe) throw new Error(t('booking.sessionNeedsClub'));
      if (!tariff || !Number.isFinite(minsNum) || minsNum <= 0) {
        throw new Error(t('booking.durationNotChosen'));
      }
      return findNearestClubWindows(
        cafe,
        {
          mins: minsNum,
          priceName: priceNameForAvailability || undefined,
          partySize,
          zoneFilter: nearestZoneFilter,
        },
        {
          maxSlots: 8,
          bookingNowMs,
          stepAdvanceMins: slotStep,
        },
      );
    },
    onSuccess: (candidates) => {
      setNearestSlotResults(candidates);
      if (!candidates.length) {
        Alert.alert(t('booking.alertBooking'), t('booking.nearestNoSlots'));
        setModalNearestSlots(false);
        return;
      }
      setModalNearestSlots(true);
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : t('booking.errorGeneric');
      Alert.alert(t('booking.alertBooking'), msg);
    },
  });

  const applyNearestSlotCandidate = useCallback(
    (c: NearestWindowCandidate) => {
      const slot = snapWindowToBookableSlot(c.windowStart, timeSlotOptions);
      setDateStart(slot.dateISO);
      setTimeStart(slot.timeStart);
      const planIv = plannedInterval(slot.dateISO, slot.timeStart, minsNum);
      const picked =
        planIv != null
          ? pickPcsForPartyForPlan(c.data.pc_list ?? [], planIv, nearestZoneFilter, partySize)
          : [];
      setSelectedPcs(picked);
      setModalNearestSlots(false);
      void qc.invalidateQueries({
        queryKey: queryKeys.allPrices({
          cafeId: cafe!.icafe_id,
          memberId: user?.memberId,
          mins: minsNum,
          bookingDate: moscowSelectionToServerDateTime(slot.dateISO, slot.timeStart).date,
        }),
      });
    },
    [qc, user?.memberId, partySize, minsNum, timeSlotOptions, nearestZoneFilter, cafe],
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
        const tariffIds = bookingTariffIdsForApi(tariff, pc, pricesList, products);
        if (tariffIds == null) {
          failed.push({
            name: pc.pc_name,
            err: t('booking.zonePriceMissing', { zone: pcZoneLabel(pc) || '?' }),
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
        const errMsg =
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : t('booking.errorGeneric');
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
            ok: result.ok.join(', '),
            failed: result.failed[0].name,
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
          setSuccessPcLine(result.ok.join(', '));
          setSuccessOpen(true);
        }
        try {
          const prefs = await loadAppPreferences();
          const partySuffix = partySize > 1 ? t('notif.partySuffix', { n: partySize }) : '';
          const when = `${dateStart} ${formatMoscowWallSlotForLocale(dateStart, timeStart, locale === 'en' ? 'en' : 'ru')}`;
          const reminderVars = {
            club: cafe!.address,
            pc: result.ok.join(', '),
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
            {
              durationMins: minsNum,
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
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : t('booking.errorGeneric');
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
    const rate = tariffRatePerMinuteRub(tariff);
    return Number.isFinite(rate) ? rate * minsNum * partySize : NaN;
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

  const bookingLine1 =
    selectedPcs.length === partySize && partySize > 1
      ? t('booking.bookingLine1Multi', {
          n: partySize,
          time: formatMoscowWallSlotForLocale(dateStart, timeStart, locale === 'en' ? 'en' : 'ru'),
        })
      : selectedPcs.length === partySize && partySize === 1
        ? t('booking.bookingLine1', {
            num: String(selectedPcs[0].pc_name).replace(/\D/g, '') || selectedPcs[0].pc_name,
            time: formatMoscowWallSlotForLocale(dateStart, timeStart, locale === 'en' ? 'en' : 'ru'),
          })
        : t('booking.bookingLine1Short');

  const showHourlyZoneRange =
    tariff?.kind === 'price' &&
    !!hourlyZoneRubRange &&
    hourlyZoneRubRange.max > hourlyZoneRubRange.min &&
    selectedPcs.length === 0;

  const bookingLine2 =
    tariff && costLabel !== '—'
      ? showHourlyZoneRange
        ? t('booking.bookingLine2HourlyZones', {
            min: Math.round(hourlyZoneRubRange!.min),
            max: Math.round(hourlyZoneRubRange!.max),
          })
        : t('booking.bookingLine2Pay', { price: payLabel })
      : t('booking.bookingLine2Duration', { mins: String(minsNum) });

  const canBook =
    tariff != null &&
    selectedPcs.length > 0 &&
    selectedPcs.length === partySize &&
    !!planIv &&
    selectedPcs.every((p) => !effectivePcBusyForPlan(p, planIv, bookingNowMs)) &&
    allSelectedPcsHaveTariff &&
    memberIdNumericOk &&
    signHintOk &&
    !bookMut.isPending &&
    !!cafe &&
    !overlapWithExistingBookings &&
    !accountOverlapBooking;

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
  const durationRowValue = useMemo(() => {
    if (!tariff) return t('booking.durationNotChosen');
    if (tariff.kind === 'product') {
      return t('booking.durationPackageLine', {
        name: String(tariff.item.product_name ?? '').trim() || '—',
        mins: parseMinsFromProduct(tariff.item, minsNum),
      });
    }
    return hourlyPresetLineLabel(minsNum, t);
  }, [tariff, minsNum, t]);

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

  const occupancyForDay = useMemo(() => {
    if (!cafe || !selectedPcs.length) return [];
    return cafeBookingRowsForOverlap
      .filter((r) => selectedPcs.some((p) => pcNamesLooselyEqual(p.pc_name, r.product_pc_name)))
      .filter((r) => {
        const iv = intervalFromMemberRow(r);
        return iv && intervalTouchesCalendarDay(iv, occupancyDayISO);
      });
  }, [cafe, selectedPcs, cafeBookingRowsForOverlap, occupancyDayISO]);

  useEffect(() => {
    if (modalOccupancy) setOccupancyDayISO(dateStart);
  }, [modalOccupancy, dateStart]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={Platform.OS === 'android'}
      >
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>{t('booking.title')}</Text>
          <TabSettingsButton />
        </View>

        <TodaysBookingBanner />

        {accountOverlapBooking ? (
          <View style={styles.oneActiveRuleBanner}>
            <MaterialCommunityIcons name="information-outline" size={22} color={colors.accent} />
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

        <ChoiceRow
          styles={styles}
          colors={colors}
          icon="map-marker-outline"
          label={t('booking.labelClub')}
          value={cafe ? cafe.address : t('booking.pickClub')}
          onPress={() => setModalClub(true)}
          filled={!!cafe}
        />

        {cafe && sessionQ.data?.active && sessionQ.data.pcName ? (
          <View style={styles.sessionBanner}>
            <MaterialCommunityIcons name="monitor-dashboard" size={22} color={colors.accent} />
            <Text style={styles.sessionBannerText}>
              {t('booking.sessionOnPc', {
                pc: sessionQ.data.pcName,
                detail: sessionQ.data.detailLabel
                  ? t('booking.sessionOnPcDetail', { t: sessionQ.data.detailLabel })
                  : '',
              })}
            </Text>
          </View>
        ) : null}

        <ChoiceRow
          styles={styles}
          colors={colors}
          icon="timer-outline"
          label={t('booking.labelDuration')}
          value={durationRowValue}
          onPress={() => setModalDuration(true)}
          filled={!!tariff && minsNum > 0}
        />

        {cafe ? (
          <View style={styles.autopickZoneBlock}>
            <Text style={styles.autopickZoneTitle}>{t('booking.schemePcTypeFilter')}</Text>
            <Text style={styles.autopickZoneHint}>{t('booking.nearestSearchZonePrefs')}</Text>
            <View style={styles.autopickZoneChips}>
              {(
                [
                  ['any', t('booking.nearestAny')],
                  ['VIP', t('booking.zoneKindVIP')],
                  ['BootCamp', t('booking.zoneKindBootCamp')],
                  ['GameZone', t('booking.zoneKindGameZone')],
                ] as const
              ).map(([key, label]) => {
                const sel = autopickZone === key;
                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [
                      styles.autopickZoneChip,
                      sel && styles.autopickZoneChipOn,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setAutopickZone(key)}
                  >
                    <Text style={[styles.autopickZoneChipText, sel && styles.autopickZoneChipTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {cafe ? (
          <Pressable
            style={({ pressed }) => [styles.btnGlobalSearch, pressed && styles.pressed]}
            onPress={() => nearestSlotsMut.mutate()}
            disabled={!memberProfileReady || !tariff || minsNum <= 0 || nearestSlotsMut.isPending}
          >
            {nearestSlotsMut.isPending ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.btnGlobalSearchText}>{t('booking.nearestNearestInClub')}</Text>
            )}
          </Pressable>
        ) : null}

        <ChoiceRow
          styles={styles}
          colors={colors}
          icon="calendar-month-outline"
          label={t('booking.labelDate')}
          value={formatDateHuman(dateStart)}
          onPress={() => setModalDate(true)}
          filled
        />
        <ChoiceRow
          styles={styles}
          colors={colors}
          icon="clock-outline"
          label={t('booking.labelTime')}
          value={timeRowValue}
          onPress={() => setModalDateTime(true)}
          filled
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
            <Text style={styles.partyBatchHint}>{t('booking.partyBatchHint')}</Text>
          </View>
        ) : null}

        {cafe ? (
          structQ.isError ? (
            <View style={styles.mapBlock} key={`map-err-${cafe.icafe_id}`}>
              <Text style={styles.mapTitle}>{t('booking.mapTitle')}</Text>
              <QueryError
                message={structQ.error instanceof ApiError ? structQ.error.message : t('booking.errorGeneric')}
                onRetry={() => void structQ.refetch()}
                t={t}
                styles={styles}
                colors={colors}
              />
            </View>
          ) : structQ.isLoading || (structQ.isFetching && !structQ.data) ? (
            <View style={styles.mapBlock} key={`map-loading-${cafe.icafe_id}`}>
              <Text style={styles.mapTitle}>{t('booking.mapTitle')}</Text>
              <SkeletonBlock height={260} colors={colors} />
            </View>
          ) : structQ.data?.rooms?.length ? (
            <View style={styles.mapBlock} key={`map-${cafe.icafe_id}`}>
              <Text style={styles.mapTitle}>{t('booking.mapTitle')}</Text>
              <FirstHintBanner hintId="booking_map" messageKey="hints.bookingMap" />
              <ClubLayoutCanvas
                rooms={structQ.data.rooms}
                colors={colors}
                icafeId={cafe.icafe_id}
                pcAvailability={pcAvailability}
                onPcPress={onMapPcPress}
                minHeight={260}
                horizontalPadding={48}
                layoutOffsetPx={getHallMapOffsetsForClub(cafe.icafe_id)}
                axisScale={getHallMapAxisScaleForClub(cafe.icafe_id)}
              />
            </View>
          ) : (
            <View style={styles.mapBlock} key={`map-empty-${cafe.icafe_id}`}>
              <Text style={styles.mapTitle}>{t('booking.mapTitle')}</Text>
              <Text style={styles.hintMuted}>{t('hallMap.emptyZones')}</Text>
            </View>
          )
        ) : null}

        <View style={styles.legend}>
          <LegendDot styles={styles} color={colors.pcFree} label={t('booking.legendFree')} />
          <LegendDot styles={styles} color={colors.pcBusy} label={t('booking.legendBusy')} />
          <LegendDot styles={styles} color={colors.pcLiveBusy} label={t('booking.legendLiveNow')} />
          <LegendDot styles={styles} color={colors.pcSelected} label={t('booking.legendSelected')} />
        </View>
        <Text style={styles.legendSourcesNote}>{t('booking.legendSourcesNote')}</Text>

        <View style={styles.zoneHeaderRow}>
          <View style={styles.zoneHeader}>
            <MaterialCommunityIcons name="desktop-classic" size={22} color={colors.muted} style={{ marginRight: 8 }} />
            <Text style={styles.zoneTitle}>{t('booking.zoneTitle')}</Text>
          </View>
          {cafe && selectedPcs.length > 0 ? (
            <Pressable
              style={({ pressed }) => [styles.occupancyBtn, pressed && styles.pressed]}
              onPress={() => setModalOccupancy(true)}
            >
              <Text style={styles.occupancyBtnText}>{t('booking.occupancy')}</Text>
            </Pressable>
          ) : null}
        </View>

        {overlapWithExistingBookings && overlapConflict ? (
          <View style={styles.overlapBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} />
            <Text style={styles.overlapBannerText}>
              {(() => {
                const { from, to } = formatIntervalClock(locale, overlapConflict.iv);
                return t('booking.overlapWarningDetail', {
                  pc: overlapConflict.pcName,
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
            message={pcsQuery.error instanceof ApiError ? pcsQuery.error.message : t('booking.errorGeneric')}
            onRetry={() => pcsQuery.refetch()}
            t={t}
            styles={styles}
            colors={colors}
          />
        ) : null}

        {selectedPcs.length < partySize && pcs && memberProfileReady ? (
          <Text style={styles.hintMuted}>{t('booking.selectNpcs', { n: partySize })}</Text>
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

        {pcs
          ? pcs.map((item, index) => {
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
                  style={[styles.pcCard, slotBusy && styles.pcCardBusy, sel && styles.pcCardSelected]}
                  onPress={() => togglePcSelection(item)}
                  disabled={slotBusy}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pcName}>{item.pc_name}</Text>
                    <Text style={styles.pcSub}>
                      {(pcZoneLabel(item) || '—')} · {pcStatusLine}
                    </Text>
                  </View>
                  {sel ? (
                    <MaterialCommunityIcons name="check-circle" size={24} color={colors.pcSelected} />
                  ) : null}
                </Pressable>
              );
            })
          : null}

        <View style={styles.bottomActions}>
          <Pressable
            style={({ pressed }) => [styles.btnGrey, pressed && styles.pressed]}
            onPress={() => setModalBooks(true)}
          >
            <Text style={styles.btnGreyText}>{t('booking.myBookings')}</Text>
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
            <Text style={styles.btnPrimaryLine2}>{bookingLine2}</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.termsLink}
          onPress={() => {
            void pricesQ.refetch();
            setModalTariff(true);
          }}
        >
          <Text style={styles.termsLinkText}>{t('booking.terms')}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={modalClub} animationType="slide" transparent onRequestClose={() => setModalClub(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setModalClub(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('booking.sheetClub')}</Text>
            {cafesQ.isLoading ? (
              <SkeletonBlock height={120} colors={colors} />
            ) : cafesQ.isError ? (
              <QueryError
                message={cafesQ.error instanceof ApiError ? cafesQ.error.message : t('booking.errorGeneric')}
                onRetry={() => cafesQ.refetch()}
                t={t}
                styles={styles}
                colors={colors}
              />
            ) : cafes.length === 0 ? (
              <Text style={styles.emptyList}>{t('cafes.empty')}</Text>
            ) : (
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetChipColumn}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {cafes.map((item) => {
                  const on = cafe?.icafe_id === item.icafe_id;
                  return (
                    <Pressable
                      key={String(item.icafe_id)}
                      style={[styles.sheetChip, on && styles.sheetChipOn]}
                      onPress={() => {
                        setCafe(item);
                        setSelectedPcs([]);
                        setModalClub(false);
                        void patchAppPreferences({ favoriteClubId: item.icafe_id });
                      }}
                    >
                      <Text style={[styles.sheetChipText, on && styles.sheetChipTextOn]}>{item.address}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={modalDate} animationType="slide" transparent onRequestClose={() => setModalDate(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setModalDate(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('booking.sheetDate')}</Text>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetChipWrap}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {datesList.map((item) => {
                const on = dateStart === item;
                return (
                  <Pressable
                    key={item}
                    style={[styles.sheetChipHalf, on && styles.sheetChipOn]}
                    onPress={() => {
                      setDateStart(item);
                      setModalDate(false);
                    }}
                  >
                    <Text style={[styles.sheetChipText, on && styles.sheetChipTextOn]} numberOfLines={2}>
                      {formatDateHuman(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={modalTime} animationType="slide" transparent onRequestClose={() => setModalDateTime(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setModalDateTime(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('booking.sheetTimeStart')}</Text>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetChipWrap}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {timeSlots.map((item) => {
                const on = timeStart === item;
                return (
                  <Pressable
                    key={item}
                    style={[styles.sheetChipQuarter, on && styles.sheetChipOn]}
                    onPress={() => {
                      setTimeStart(item);
                      setModalDateTime(false);
                    }}
                  >
                    <Text style={[styles.sheetChipTextSm, on && styles.sheetChipTextOn]}>
                      {formatMoscowWallSlotForLocale(dateStart, item, locale === 'en' ? 'en' : 'ru')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={modalDuration} animationType="slide" transparent onRequestClose={() => setModalDuration(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setModalDuration(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('booking.sheetDuration')}</Text>
            {pricesQ.isLoading ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} /> : null}
            {pricesQ.isError ? (
              <QueryError
                message={pricesQ.error instanceof ApiError ? pricesQ.error.message : t('booking.errorGeneric')}
                onRetry={() => pricesQ.refetch()}
                t={t}
                styles={styles}
                colors={colors}
              />
            ) : null}
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.packageSectionHeader}>{t('booking.durationPresetsSection')}</Text>
              <View style={styles.sheetChipWrap}>
                {hourlyPresetMins.map((m) => {
                  const presetLabel = hourlyPresetLineLabel(m, t);
                  const sel = tariff?.kind === 'price' && minsNum === m;
                  return (
                    <Pressable
                      key={`preset-${m}`}
                      style={[styles.sheetChipQuarter, sel && styles.sheetChipOn]}
                      onPress={() => {
                        const tpl = pickHourlyTemplateForSessionMins(pricesList, m);
                        if (!tpl) {
                          Alert.alert(t('booking.alertBooking'), t('booking.noHourlyTier'));
                          return;
                        }
                        const next = matchPriceTierToMinutes(pricesList, tpl, m);
                        setTariff({ kind: 'price', item: next });
                        setPriceName(next.price_name);
                        setMins(String(m));
                        setModalDuration(false);
                      }}
                    >
                      <Text style={[styles.sheetChipTextSm, sel && styles.sheetChipTextOn]}>{presetLabel}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {products.length ? (
                <>
                  <Text style={styles.packageSectionHeader}>{t('booking.packagesSection')}</Text>
                  <View style={styles.sheetChipColumn}>
                    {products.map((p) => {
                      const sel =
                        tariff?.kind === 'product' &&
                        tariff.item.product_id === p.product_id &&
                        String(tariff.item.group_name ?? '') === String(p.group_name ?? '');
                      return (
                        <Pressable
                          key={`prod-${p.product_id}-${String(p.group_name ?? '')}`}
                          style={[styles.sheetChip, sel && styles.sheetChipOn]}
                          onPress={() => {
                            try {
                              const next: TariffChoice = { kind: 'product', item: p };
                              setTariff(next);
                              setPriceName(p.product_name);
                              setMins(String(parseMinsFromProduct(p, minsNum)));
                              setModalDuration(false);
                            } catch (e) {
                              console.warn('booking package select', e);
                            }
                          }}
                        >
                          <Text style={[styles.sheetChipText, sel && styles.sheetChipTextOn]}>{productTierLabel(p)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
              {!pricesQ.isLoading && !products.length && !pricesList.length ? (
                <Text style={styles.emptyList}>{t('booking.noPackages')}</Text>
              ) : null}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={modalTariff} animationType="slide" transparent onRequestClose={() => setModalTariff(false)}>
        <SafeAreaView style={[styles.fullSheetSafe, { paddingTop: Math.max(insets.top, 12) }]} edges={['bottom']}>
          <Text style={styles.sheetTitle}>{t('booking.tariffsTitle')}</Text>
          {pricesQ.isLoading ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} /> : null}
          {pricesQ.isError ? (
            <QueryError
              message={pricesQ.error instanceof ApiError ? pricesQ.error.message : t('booking.errorGeneric')}
              onRetry={() => pricesQ.refetch()}
              t={t}
              styles={styles}
              colors={colors}
            />
          ) : (
            <ScrollView style={styles.modalScrollFlex} keyboardShouldPersistTaps="handled">
              {products.length === 0 && pricesList.length === 0 && !pricesQ.isLoading ? (
                <Text style={styles.muted}>{t('booking.termsEmpty')}</Text>
              ) : (
                <>
                  {hourlyTariffGroups.map(([gKey, items]) => (
                    <View key={gKey} style={styles.tariffGroupBlock}>
                      <Text style={styles.tariffGroupTitle}>
                        {items[0]
                          ? `«${String(items[0].price_name ?? '').trim()}»${
                              items[0].group_name?.trim() ? ` · ${items[0].group_name.trim()}` : ''
                            }`
                          : ''}
                      </Text>
                      {items.map((p, idx) => (
                        <Text
                          key={`${gKey}-${p.price_id}-${String(p.duration ?? '')}-${idx}`}
                          style={styles.tariffLine}
                        >
                          {parseMinsFromPriceItem(p, 0) > 0
                            ? `${parseMinsFromPriceItem(p, 0)} мин — ${priceCostLabel(p)} ₽/мин`
                            : priceHourlyStepLabel(p)}
                        </Text>
                      ))}
                    </View>
                  ))}
                  {products.map((p) => (
                    <Text key={`${p.product_id}-${String(p.group_name ?? '')}`} style={styles.tariffLine}>
                      {productTierLabel(p)}
                    </Text>
                  ))}
                </>
              )}
            </ScrollView>
          )}
          <Pressable style={styles.sheetDone} onPress={() => setModalTariff(false)}>
            <Text style={styles.sheetDoneText}>{t('booking.close')}</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>

      <Modal visible={modalNearestSlots} animationType="slide" transparent onRequestClose={() => setModalNearestSlots(false)}>
        <SafeAreaView style={[styles.fullSheetSafe, { paddingTop: Math.max(insets.top, 12) }]} edges={['bottom']}>
          <View style={styles.sheetHeaderRow}>
            <Text style={[styles.sheetTitle, { flex: 1 }]}>{t('booking.nearestNearestInClub')}</Text>
            <Pressable onPress={() => setModalNearestSlots(false)} hitSlop={8}>
              <Text style={styles.sheetHeaderClose}>{t('booking.close')}</Text>
            </Pressable>
          </View>
          {cafe ? <Text style={styles.nearestSheetClubLine}>{cafe.address}</Text> : null}
          <ScrollView style={styles.modalScrollFlex} keyboardShouldPersistTaps="handled">
            {nearestSlotResults.map((c, idx) => (
              <Pressable
                key={`${c.cafe.icafe_id}-${c.windowStart.getTime()}-${idx}`}
                style={({ pressed }) => [styles.crossClubRow, pressed && styles.pressed]}
                onPress={() => applyNearestSlotCandidate(c)}
              >
                <Text style={styles.crossClubWhen}>
                  {t('booking.crossClubWindow', {
                    when: `${formatISODateMoscow(c.windowStart)} ${formatInstantMoscowWallForLocale(c.windowStart, locale)}`,
                  })}
                </Text>
                <Text style={styles.crossClubApply}>{t('booking.crossClubApply')}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={modalOccupancy} animationType="slide" transparent onRequestClose={() => setModalOccupancy(false)}>
        <SafeAreaView style={[styles.fullSheetSafe, { paddingTop: Math.max(insets.top, 12) }]} edges={['bottom']}>
          <Text style={styles.sheetTitle}>{t('booking.occupancyTitle')}</Text>
          {selectedPcs.length ? (
            <Text style={styles.occPcHint}>{selectedPcs.map((p) => p.pc_name).join(', ')}</Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.occDaysScroll}>
            {occupancyDaysStrip.map((d) => {
              const sel = occupancyDayISO === d;
              return (
                <Pressable
                  key={d}
                  style={[styles.occDayChip, sel && styles.occDayChipOn]}
                  onPress={() => setOccupancyDayISO(d)}
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
          ) : occupancyForDay.length === 0 ? (
            <Text style={styles.muted}>{t('booking.occupancyEmpty')}</Text>
          ) : (
            occupancyForDay.map((r, i) => {
              const iv = intervalFromMemberRow(r);
              const conflict = !!(iv && planIv && intervalsOverlap(iv, planIv));
              return (
                <View
                  key={`${r.product_id}-${i}`}
                  style={[styles.occRow, conflict ? styles.occRowWarn : null]}
                >
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

      <Modal visible={modalBooks} animationType="slide" transparent onRequestClose={() => setModalBooks(false)}>
        <SafeAreaView style={[styles.fullSheetSafe, { paddingTop: Math.max(insets.top, 12) }]} edges={['bottom']}>
          <Text style={styles.sheetTitle}>{t('booking.myBookingsTitle')}</Text>
          <Text style={styles.myBookingsHint}>{t('booking.myBookingsHint')}</Text>
          {booksQ.isLoading ? (
            <SkeletonBlock height={160} colors={colors} style={{ marginVertical: 16 }} />
          ) : booksQ.isError ? (
            <QueryError
              message={booksQ.error instanceof ApiError ? booksQ.error.message : t('booking.booksLoadError')}
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
                  refreshing={booksQ.isFetching && !booksQ.isLoading}
                  onRefresh={() => void booksQ.refetch()}
                  tintColor={colors.accent}
                  colors={[colors.accent]}
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
                return (
                  <View key={icafe} style={styles.bookBlock}>
                    <Text style={styles.icafe}>{t('booking.clubPrefix', { id: icafe })}</Text>
                    {rows.map((r: MemberBookingRow, i: number) => (
                      <BookingCard
                        key={`${r.product_id}-${r.product_pc_name}-${i}`}
                        row={r}
                        locale={locale}
                        styles={styles}
                        t={t}
                        colors={colors}
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
        color={filled ? colors.accent : colors.muted}
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
  return (
    <View style={styles.userBookCard}>
      {statusLabel ? <Text style={styles.userBookStatus}>{statusLabel}</Text> : null}
      <Text style={styles.userBookPc}>{t('booking.userBookingPlace', { name: row.product_pc_name })}</Text>
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
        <Pressable style={styles.repeatBookBtn} onPress={onRepeat}>
          <Text style={styles.repeatBookBtnText}>{t('booking.repeatBooking')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createBookingStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 16 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16,
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
    choiceLabel: { color: colors.accent, fontSize: 15, fontWeight: '600' },
    choiceValue: { color: colors.text, fontSize: 17, marginTop: 4, fontWeight: '600' },
    choiceValueMuted: { color: colors.muted },
    partyBlock: { marginBottom: 16 },
    partyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    partyBatchHint: {
      marginTop: 8,
      paddingHorizontal: 4,
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
    },
    partyLabel: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
    partyBtn: {
      minWidth: 44,
      paddingVertical: 8,
      alignItems: 'center',
      backgroundColor: colors.zoneBg,
      borderRadius: 10,
    },
    partyBtnText: { fontSize: 22, fontWeight: '700', color: colors.accent },
    partyValue: { fontSize: 20, fontWeight: '700', color: colors.text, minWidth: 32, textAlign: 'center' },
    autopickZoneBlock: { marginBottom: 12 },
    autopickZoneTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
    autopickZoneHint: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 10 },
    autopickZoneChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    autopickZoneChip: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    autopickZoneChipOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accentDark,
    },
    autopickZoneChipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
    autopickZoneChipTextOn: { color: colors.accent },
    zoneHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      marginBottom: 8,
      gap: 8,
    },
    zoneHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    zoneTitle: { color: colors.muted, fontSize: 19, fontWeight: '600' },
    occupancyBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.accentDim,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    occupancyBtnText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
    btnGlobalSearch: {
      backgroundColor: colors.zoneBg,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 12,
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
    crossClubAddr: { color: colors.text, fontWeight: '700', fontSize: 16 },
    crossClubWhen: { color: colors.muted, marginTop: 6, fontSize: 15 },
    crossClubApply: { color: colors.accent, fontWeight: '700', marginTop: 8, fontSize: 15 },
    occPcHint: { color: colors.muted, marginBottom: 12, fontSize: 15 },
    occDaysScroll: { marginBottom: 12, maxHeight: 48 },
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
    mapBlock: { marginBottom: 12, overflow: 'hidden' },
    mapTitle: { color: colors.muted, fontSize: 15, fontWeight: '600', marginBottom: 8 },
    sessionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
      padding: 12,
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
      gap: 12,
      marginBottom: 12,
      paddingVertical: 10,
      backgroundColor: colors.zoneBg,
      borderRadius: 10,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
    legendSourcesNote: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
      marginBottom: 14,
      paddingHorizontal: 12,
    },
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
    hintMuted: { color: colors.muted, fontSize: 14, marginBottom: 12, textAlign: 'center' },
    hintWarn: { color: colors.danger, fontSize: 14, marginBottom: 12, textAlign: 'center' },
    pcCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      marginBottom: 8,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pcCardBusy: { opacity: 0.55 },
    pcCardSelected: { borderColor: colors.pcSelected, backgroundColor: colors.chipOn },
    pcName: { color: colors.text, fontWeight: '700', fontSize: 17 },
    pcSub: { color: colors.muted, fontSize: 14, marginTop: 2 },
    bottomActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
      alignItems: 'stretch',
    },
    btnGrey: {
      flex: 1,
      backgroundColor: colors.mutedDark,
      borderRadius: 12,
      paddingVertical: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnGreyText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
    btnPrimary: {
      flex: 1.25,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 64,
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
      fontWeight: '700',
      fontSize: 14,
      marginTop: 2,
      textAlign: 'center',
    },
    termsLink: { alignSelf: 'center', marginTop: 16, padding: 8 },
    termsLinkText: { color: colors.muted, fontSize: 15 },
    pressed: { opacity: 0.88 },
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      paddingBottom: 20,
      maxHeight: '88%',
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
    sheetHeaderClose: { color: colors.accent, fontWeight: '600', fontSize: 16 },
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
      gap: 10,
      padding: 12,
      marginBottom: 12,
      backgroundColor: colors.accentDim,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    oneActiveRuleText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
    myBookingsHint: { color: colors.muted, fontSize: 13, marginBottom: 10, lineHeight: 18 },
    userBookCard: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userBookStatus: {
      alignSelf: 'flex-start',
      marginBottom: 8,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
      fontSize: 12,
      fontWeight: '800',
      color: colors.accent,
      backgroundColor: colors.accentDim,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    userBookPc: { color: colors.accent, fontWeight: '700', fontSize: 16 },
    userBookTime: { color: colors.muted, marginTop: 6, fontSize: 15 },
    muted: { color: colors.muted },
    queryErr: { padding: 12, marginBottom: 12, backgroundColor: colors.zoneBg, borderRadius: 12 },
    queryErrText: { color: colors.danger, marginBottom: 8, fontSize: 14 },
    queryErrBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.accentDim, borderRadius: 10 },
    queryErrBtnText: { color: colors.text, fontWeight: '600' },
    successOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
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
    successBtnSecondaryText: { color: colors.accent, fontWeight: '600', fontSize: 16 },
    successBtn: {
      marginTop: 16,
      backgroundColor: colors.accentSecondary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 48,
      minWidth: 200,
      alignItems: 'center',
    },
    successBtnText: { color: colors.text, fontWeight: '700', fontSize: 18 },
  });
}
