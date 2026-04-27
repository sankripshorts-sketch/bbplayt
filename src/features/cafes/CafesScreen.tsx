import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../../components/DinText';
import { TextInput } from '../../components/DinTextInput';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { type BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookingFlowApi, cafesApi } from '../../api/endpoints';
import { cafesInCity, DEFAULT_CITY_ID } from '../../config/citiesCatalog';
import type { CafeItem } from '../../api/types';
import { FirstHintBanner } from '../../hints/FirstHintBanner';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { loadAppPreferences, patchAppPreferences } from '../../preferences/appPreferences';
import { resolveEffectiveCityId } from '../../preferences/effectiveCity';
import { queryKeys } from '../../query/queryKeys';
import { formatPublicErrorMessage } from '../../utils/publicText';
import { HallMapPanel } from './HallMapPanel';
import {
  dialPhone,
  openHttpUrl,
  openSystemMapsForAddress,
} from './mapLinks';
import { ClubDataLoader } from '../ui/ClubDataLoader';
import { TabScreenTopBar } from '../../components/TabScreenTopBar';
import { DimmedSheetModal } from '../../components/DimmedSheetModal';
import { DraggableWheelSheet } from '../booking/DraggableWheelSheet';
import { TodaysBookingBanner } from '../booking/TodaysBookingBanner';
import type { MainTabParamList } from '../../navigation/types';

function cafeMatchesSearchQuery(c: CafeItem, qy: string): boolean {
  const name = (c.name ?? '').trim().toLowerCase();
  const addr = c.address.toLowerCase();
  return name.includes(qy) || addr.includes(qy);
}

function cafePickerLabel(c: CafeItem): string {
  const n = (c.name ?? '').trim();
  return n || c.address;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function shortVkDisplay(url: string): string {
  try {
    const normalized = url.includes('://') ? url : `https://${url}`;
    const u = new URL(normalized);
    const path = u.pathname === '/' ? '' : u.pathname;
    return `${u.hostname.replace(/^www\./, '')}${path}`.slice(0, 52);
  } catch {
    return url;
  }
}

type RowStyles = ReturnType<typeof createStyles>;

function CafeInfoRow(props: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  colors: ColorPalette;
  styles: RowStyles;
  onPress?: () => void;
  isLast?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const { label, value, icon, colors, styles, onPress, isLast, rightSlot } = props;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.infoRow,
        !isLast && styles.infoRowBorder,
        pressed && onPress ? styles.infoRowPressed : null,
      ]}
    >
      <View style={styles.infoRowTextCol}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={4}>
          {value}
        </Text>
      </View>
      {rightSlot ?? <MaterialCommunityIcons name={icon} size={22} color={colors.text} />}
    </Pressable>
  );
}

export function CafesScreen() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const rootPad = windowWidth < 360 ? 14 : 20;
  const heroHeight = Math.min(132, Math.max(88, Math.round(windowHeight * 0.17)));
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const styles = useMemo(() => createStyles(colors, windowHeight), [colors, windowHeight]);

  const q = useQuery({
    queryKey: queryKeys.cafes(),
    queryFn: () => cafesApi.list(),
    staleTime: 10 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
  const icafeQ = useQuery({
    queryKey: queryKeys.icafeIdForMember(),
    queryFn: () => bookingFlowApi.icafeIdForMember(),
    staleTime: 10 * 60 * 1000,
  });
  const [mapCafe, setMapCafe] = useState<CafeItem | null>(null);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [effectiveCityId, setEffectiveCityId] = useState(DEFAULT_CITY_ID);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByDistance, setSortByDistance] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [jobReviewOpen, setJobReviewOpen] = useState(false);
  const [clubPickerOpen, setClubPickerOpen] = useState(false);
  const [jobReviewClubId, setJobReviewClubId] = useState<number | null>(null);
  const [jobReviewStars, setJobReviewStars] = useState(0);
  const [jobReviewTopic, setJobReviewTopic] = useState('');
  const [jobReviewBody, setJobReviewBody] = useState('');
  const [jobReviewContact, setJobReviewContact] = useState('');
  const [jobReviewSuccessOpen, setJobReviewSuccessOpen] = useState(false);

  useEffect(() => {
    void loadAppPreferences().then((p) => setFavoriteId(p.favoriteClubId));
  }, []);

  const refreshCity = useCallback(() => {
    void loadAppPreferences().then((p) => {
      setEffectiveCityId(resolveEffectiveCityId(p, q.data));
    });
  }, [q.data]);

  useFocusEffect(
    useCallback(() => {
      refreshCity();
    }, [refreshCity]),
  );

  useEffect(() => {
    refreshCity();
  }, [refreshCity]);

  const catalogHasCoords = useMemo(
    () => (q.data ?? []).some((c) => typeof c.lat === 'number' && typeof c.lng === 'number'),
    [q.data],
  );

  const displayList = useMemo(() => {
    let list = q.data ?? [];
    const inCity = cafesInCity(list, effectiveCityId);
    if (inCity.length > 0) list = inCity;
    const qy = searchQuery.trim().toLowerCase();
    if (qy) list = list.filter((c) => cafeMatchesSearchQuery(c, qy));
    if (sortByDistance && userPos && catalogHasCoords) {
      list = [...list].sort((a, b) => {
        const da =
          typeof a.lat === 'number' && typeof a.lng === 'number'
            ? haversineKm(userPos.lat, userPos.lng, a.lat, a.lng)
            : Number.POSITIVE_INFINITY;
        const db =
          typeof b.lat === 'number' && typeof b.lng === 'number'
            ? haversineKm(userPos.lat, userPos.lng, b.lat, b.lng)
            : Number.POSITIVE_INFINITY;
        return da - db;
      });
    }
    return list;
  }, [q.data, effectiveCityId, searchQuery, sortByDistance, userPos, catalogHasCoords]);

  const toggleFavorite = useCallback(
    async (item: CafeItem) => {
      const next = favoriteId === item.icafe_id ? null : item.icafe_id;
      setFavoriteId(next);
      await patchAppPreferences({ favoriteClubId: next });
    },
    [favoriteId],
  );

  const openMapSafe = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch {
        Alert.alert('', t('cafes.mapsOpenFail'));
      }
    },
    [t],
  );

  const onSortByDistance = useCallback(async () => {
    if (!catalogHasCoords) {
      Alert.alert('', t('cafes.distanceSortUnavailable'));
      return;
    }
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setSortByDistance(true);
          },
          () => Alert.alert('', t('cafes.locationDenied')),
          { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
        );
      } else {
        Alert.alert('', t('cafes.locationDenied'));
      }
      return;
    }
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', t('cafes.locationDenied'));
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setSortByDistance(true);
    } catch {
      Alert.alert('', t('cafes.locationDenied'));
    }
  }, [catalogHasCoords, t]);

  const clearSort = useCallback(() => {
    setSortByDistance(false);
    setUserPos(null);
  }, []);

  const closeJobReview = useCallback(() => {
    setClubPickerOpen(false);
    setJobReviewOpen(false);
  }, []);

  const onJobReviewSubmit = useCallback(() => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[job-review-mock]', {
        clubId: jobReviewClubId,
        stars: jobReviewStars,
        topic: jobReviewTopic.trim(),
        body: jobReviewBody.trim(),
        contact: jobReviewContact.trim(),
      });
    }
    setJobReviewTopic('');
    setJobReviewBody('');
    setJobReviewContact('');
    setJobReviewClubId(null);
    setJobReviewStars(0);
    setClubPickerOpen(false);
    setJobReviewOpen(false);
    // Alert не показывается на веб; полноэкранный Modal — как у успешного бронирования
    setTimeout(() => {
      setJobReviewSuccessOpen(true);
    }, 0);
  }, [jobReviewBody, jobReviewClubId, jobReviewContact, jobReviewStars, jobReviewTopic]);

  const selectedJobReviewClub = useMemo(() => {
    if (jobReviewClubId == null) return null;
    return (q.data ?? []).find((c) => c.icafe_id === jobReviewClubId) ?? null;
  }, [jobReviewClubId, q.data]);

  const renderItem = ({ item }: { item: CafeItem }) => {
    const fav = favoriteId === item.icafe_id;
    const distKm =
      userPos && typeof item.lat === 'number' && typeof item.lng === 'number'
        ? haversineKm(userPos.lat, userPos.lng, item.lat, item.lng)
        : null;
    const heroPair =
      item.icafe_id % 2 === 0
        ? ([colors.cardElevated, colors.zoneBg] as const)
        : ([colors.card, '#1a2330'] as const);

    return (
      <View style={styles.clubCard}>
        <View style={[styles.heroShell, { height: heroHeight }]}>
          <LinearGradient colors={[heroPair[0], heroPair[1]]} style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(27,34,42,0)', 'rgba(27,34,42,0.65)', colors.card]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <MaterialCommunityIcons
            name="storefront-outline"
            size={56}
            color="rgba(255,255,255,0.1)"
            style={styles.heroWatermark}
          />
          {distKm != null ? (
            <Text style={styles.heroDist}>~{distKm.toFixed(1)} km</Text>
          ) : null}
          <Pressable
            onPress={() => toggleFavorite(item)}
            accessibilityLabel={t('cafes.favorite')}
            style={({ pressed }) => [styles.heroStar, pressed && styles.heroStarPressed]}
          >
            <MaterialCommunityIcons
              name={fav ? 'star' : 'star-outline'}
              size={26}
              color={fav ? colors.accentSecondary : colors.text}
            />
          </Pressable>
        </View>

        <View style={styles.cardBody}>
          <CafeInfoRow
            label={t('cafes.labelAddress')}
            value={item.address}
            icon="map-marker-outline"
            colors={colors}
            styles={styles}
            isLast={!item.phone && !item.vk_url && !item.site}
            onPress={() =>
              void openMapSafe(() => openSystemMapsForAddress(item.address))
            }
            rightSlot={
              <View style={styles.addressActionsCol}>
                <Pressable
                  style={styles.routeBtn}
                  onPress={() =>
                    void openMapSafe(() => openSystemMapsForAddress(item.address))
                  }
                >
                  <Text style={styles.routeBtnText}>{t('cafes.howToGet')}</Text>
                </Pressable>
              </View>
            }
          />
          {item.phone ? (
            <CafeInfoRow
              label={t('cafes.labelPhone')}
              value={item.phone}
              icon="cellphone"
              colors={colors}
              styles={styles}
              isLast={!item.vk_url && !item.site}
              onPress={async () => {
                try {
                  await dialPhone(item.phone!);
                } catch {
                  Alert.alert('', t('cafes.actionFail'));
                }
              }}
            />
          ) : null}
          {item.vk_url ? (
            <CafeInfoRow
              label={t('cafes.labelVk')}
              value={shortVkDisplay(item.vk_url)}
              icon="alpha-v-circle-outline"
              colors={colors}
              styles={styles}
              isLast={!item.site}
              onPress={() => void openMapSafe(() => openHttpUrl(item.vk_url!))}
            />
          ) : null}
          {item.site ? (
            <CafeInfoRow
              label={t('cafes.labelSite')}
              value={shortVkDisplay(item.site)}
              icon="web"
              colors={colors}
              styles={styles}
              isLast
              onPress={() => void openMapSafe(() => openHttpUrl(item.site!))}
            />
          ) : null}

          <View style={styles.mapActionsRow}>
            <Pressable style={styles.mapBtn} onPress={() => setMapCafe(item)}>
              <Text style={styles.mapBtnText}>{t('cafes.floorPlan')}</Text>
            </Pressable>
            <Pressable
              style={styles.bookBtn}
              onPress={() =>
                navigation.navigate('Booking', {
                  prefill: { icafeId: item.icafe_id },
                })
              }
            >
              <Text style={styles.bookBtnText}>{t('cafes.bookHere')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { paddingHorizontal: rootPad }]} edges={['top']}>
      <TodaysBookingBanner />
      <TabScreenTopBar title={t('tabs.cafes')} horizontalPadding={0} />

      {icafeQ.isLoading ? (
        <Text style={styles.hint}>{t('cafes.loadingIcafe')}</Text>
      ) : icafeQ.isError ? (
        <Text style={styles.hintMuted}>{t('cafes.icafeUnavailable')}</Text>
      ) : null}

      <FirstHintBanner hintId="clubs_route" messageKey="hints.clubsRoute" />

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('cafes.searchPlaceholder')}
        placeholderTextColor={colors.muted}
        style={styles.search}
        autoCorrect={false}
        autoCapitalize="none"
      />

      <View style={styles.sortRow}>
        <Pressable
          style={[styles.sortBtn, sortByDistance && styles.sortBtnActive]}
          onPress={() => void onSortByDistance()}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.accentBright} />
          <Text style={styles.sortBtnText}>{t('cafes.sortByDistance')}</Text>
        </Pressable>
        {sortByDistance ? (
          <Pressable style={styles.sortBtn} onPress={clearSort}>
            <Text style={styles.sortBtnText}>{t('cafes.sortOff')}</Text>
          </Pressable>
        ) : null}
      </View>

      <DimmedSheetModal
        visible={jobReviewOpen}
        onRequestClose={closeJobReview}
        contentAlign="stretch"
        contentWrapperStyle={styles.jobModalHost}
      >
        {(onSheetDrag) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.jobModalKeyboard}
          >
            <DraggableWheelSheet
              open={jobReviewOpen}
              onRequestClose={closeJobReview}
              onDragOffsetChange={onSheetDrag}
              colors={colors}
              sheetStyle={styles.jobModalSheet}
              dragExtendBelowGrabberPx={120}
              extendToBottomEdge={false}
            >
            <View style={styles.jobModalHeader}>
              <Text style={styles.jobModalTitle}>{t('cafes.jobReview')}</Text>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.jobModalScroll}
              contentContainerStyle={styles.jobModalScrollContent}
            >
              <View style={styles.jobModalSection}>
                <Text style={styles.jobModalSectionLabel}>{t('cafes.jobReviewSectionClub')}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.jobModalSelect,
                    pressed ? styles.jobModalSelectPressed : null,
                  ]}
                  onPress={() => setClubPickerOpen(true)}
                  accessibilityRole="button"
                >
                  <Text
                    style={
                      selectedJobReviewClub
                        ? styles.jobModalSelectText
                        : styles.jobModalSelectPlaceholder
                    }
                    numberOfLines={2}
                  >
                    {selectedJobReviewClub
                      ? cafePickerLabel(selectedJobReviewClub)
                      : t('cafes.jobReviewPlaceholderClub')}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={22} color={colors.muted} />
                </Pressable>
              </View>
              <View style={styles.jobModalSection}>
                <Text style={styles.jobModalSectionLabel}>{t('cafes.jobReviewSectionRating')}</Text>
                <View style={styles.jobModalStarsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setJobReviewStars(n)}
                      accessibilityRole="button"
                      hitSlop={6}
                    >
                      <MaterialCommunityIcons
                        name={n <= jobReviewStars ? 'star' : 'star-outline'}
                        size={32}
                        color={n <= jobReviewStars ? colors.accentBright : colors.muted}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.jobModalSection}>
                <Text style={styles.jobModalSectionLabel}>{t('cafes.jobReviewSectionTopic')}</Text>
                <TextInput
                  value={jobReviewTopic}
                  onChangeText={setJobReviewTopic}
                  placeholder={t('cafes.jobReviewPlaceholderTopic')}
                  placeholderTextColor={colors.muted}
                  style={styles.jobModalInput}
                />
              </View>
              <View style={styles.jobModalSection}>
                <Text style={styles.jobModalSectionLabel}>{t('cafes.jobReviewSectionBody')}</Text>
                <TextInput
                  value={jobReviewBody}
                  onChangeText={setJobReviewBody}
                  placeholder={t('cafes.jobReviewPlaceholderBody')}
                  placeholderTextColor={colors.muted}
                  style={styles.jobModalTextArea}
                  multiline
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.jobModalSection}>
                <Text style={styles.jobModalSectionLabel}>{t('cafes.jobReviewSectionContact')}</Text>
                <TextInput
                  value={jobReviewContact}
                  onChangeText={setJobReviewContact}
                  placeholder={t('cafes.jobReviewPlaceholderContact')}
                  placeholderTextColor={colors.muted}
                  style={styles.jobModalInput}
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </View>
            </ScrollView>
            <Pressable
              style={({ pressed }) => [
                styles.jobModalSubmitBtn,
                pressed && styles.jobModalSubmitBtnPressed,
              ]}
              onPress={onJobReviewSubmit}
            >
              <Text style={styles.jobModalSubmitBtnText}>{t('cafes.jobReviewSubmit')}</Text>
            </Pressable>
            </DraggableWheelSheet>
          </KeyboardAvoidingView>
        )}
      </DimmedSheetModal>

      <Modal
        visible={clubPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setClubPickerOpen(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <View style={styles.clubPickRoot}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
            onPress={() => setClubPickerOpen(false)}
            accessibilityRole="button"
          />
          <View style={styles.clubPickSheet}>
            <Text style={styles.clubPickTitle}>{t('cafes.jobReviewPickClubTitle')}</Text>
            <FlatList
              data={q.data ?? []}
              keyExtractor={(item) => String(item.icafe_id)}
              keyboardShouldPersistTaps="handled"
              style={styles.clubPickList}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.clubPickRow,
                    jobReviewClubId === item.icafe_id && styles.clubPickRowActive,
                    pressed && styles.clubPickRowPressed,
                  ]}
                  onPress={() => {
                    setJobReviewClubId(item.icafe_id);
                    setClubPickerOpen(false);
                  }}
                >
                  <Text style={styles.clubPickRowTitle} numberOfLines={2}>
                    {cafePickerLabel(item)}
                  </Text>
                  {item.name?.trim() ? (
                    <Text style={styles.clubPickRowSub} numberOfLines={2}>
                      {item.address}
                    </Text>
                  ) : null}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.clubPickEmpty}>{t('cafes.empty')}</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {mapCafe ? (
        <HallMapPanel cafe={mapCafe} visible onClose={() => setMapCafe(null)} />
      ) : null}
      <View style={styles.bodyFlex}>
        {q.isLoading ? (
          <ClubDataLoader message={t('common.loader.captionClub')} />
        ) : q.isError ? (
          <View style={styles.errBox}>
            <Text style={styles.err}>{formatPublicErrorMessage(q.error, t, 'cafes.loadError')}</Text>
            <Pressable style={styles.retryBtn} onPress={() => q.refetch()}>
              <Text style={styles.retryText}>{t('booking.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={displayList}
            keyExtractor={(item) => String(item.icafe_id)}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={styles.empty}>{t('cafes.empty')}</Text>}
            contentContainerStyle={styles.list}
            style={styles.listFlex}
          />
        )}
      </View>
      <View
        style={[
          styles.screenFooter,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.footerReviewBtn,
            pressed && styles.footerReviewBtnPressed,
          ]}
          onPress={() => {
            setJobReviewOpen(true);
          }}
        >
          <Text style={styles.footerReviewBtnText}>{t('cafes.jobReview')}</Text>
        </Pressable>
      </View>

      <Modal
        visible={jobReviewSuccessOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setJobReviewSuccessOpen(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <View style={styles.jobReviewSuccessOverlay}>
          <View style={styles.jobReviewSuccessCard}>
            <Text style={styles.jobReviewSuccessTitle}>{t('cafes.jobReviewSuccessHeadline')}</Text>
            <Text style={styles.jobReviewSuccessDescr}>{t('cafes.jobReviewSuccessSub')}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.jobReviewSuccessBtn,
                pressed && styles.jobModalSubmitBtnPressed,
              ]}
              onPress={() => setJobReviewSuccessOpen(false)}
              accessibilityRole="button"
            >
              <Text style={styles.jobReviewSuccessBtnText}>{t('booking.successOk')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette, windowHeight: number) {
  const jobModalScrollMaxH = Math.min(640, Math.max(400, windowHeight * 0.58));
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    bodyFlex: { flex: 1, minHeight: 0 },
    hint: { color: colors.accentBright, fontSize: 14, marginBottom: 12, lineHeight: 20 },
    hintMuted: { color: colors.muted, fontSize: 14, marginBottom: 12 },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: colors.text,
      marginBottom: 10,
      backgroundColor: colors.card,
    },
    sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    sortBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    sortBtnActive: { borderColor: colors.accent },
    sortBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    listFlex: { flex: 1 },
    list: { paddingBottom: 12 },
    screenFooter: {
      paddingTop: 8,
    },
    footerReviewBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    footerReviewBtnPressed: { opacity: 0.92 },
    footerReviewBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 14 },
    clubCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    heroShell: {
      position: 'relative',
      overflow: 'hidden',
    },
    heroWatermark: { position: 'absolute', alignSelf: 'center', top: 28 },
    heroDist: {
      position: 'absolute',
      left: 12,
      bottom: 10,
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
    },
    heroStar: {
      position: 'absolute',
      right: 6,
      top: 6,
      minWidth: 44,
      minHeight: 44,
      padding: 6,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.25)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroStarPressed: { opacity: 0.88 },
    cardBody: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    infoRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    infoRowPressed: { opacity: 0.88 },
    infoRowTextCol: { flex: 1, minWidth: 0 },
    infoLabel: { color: colors.muted, fontSize: 12, marginBottom: 4, fontWeight: '500' },
    infoValue: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22 },
    addressActionsCol: {
      alignItems: 'flex-end',
      gap: 8,
      marginLeft: 8,
    },
    routeBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.accentDim,
    },
    routeBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    mapActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
      alignItems: 'stretch',
    },
    mapBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: 'transparent',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapBtnText: { color: colors.accentBright, fontWeight: '700', fontSize: 14 },
    bookBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 14 },
    err: { color: colors.danger, marginBottom: 8 },
    errBox: { paddingVertical: 8 },
    retryBtn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accentDim,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    retryText: { color: colors.text, fontWeight: '600' },
    empty: { color: colors.muted },
    jobModalHost: { flex: 1, justifyContent: 'flex-end' },
    jobModalKeyboard: { flex: 1, width: '100%', justifyContent: 'flex-end' },
    jobModalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
      maxHeight: '92%',
      borderWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    jobModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    jobModalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, flex: 1, paddingRight: 12 },
    jobModalScroll: { maxHeight: jobModalScrollMaxH },
    jobModalScrollContent: { flexGrow: 1, paddingBottom: 4 },
    jobModalSection: { marginBottom: 18 },
    jobModalSectionLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    jobModalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 16,
      backgroundColor: colors.bg,
    },
    jobModalTextArea: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 16,
      minHeight: 120,
      backgroundColor: colors.bg,
    },
    jobModalSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.bg,
    },
    jobModalSelectPressed: { opacity: 0.9 },
    jobModalSelectText: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    jobModalSelectPlaceholder: {
      flex: 1,
      color: colors.muted,
      fontSize: 16,
    },
    jobModalStarsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      maxWidth: 220,
    },
    jobModalSubmitBtn: {
      marginTop: 8,
      backgroundColor: colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    jobModalSubmitBtnPressed: { opacity: 0.92 },
    jobModalSubmitBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 15 },
    jobReviewSuccessOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      padding: 24,
    },
    jobReviewSuccessCard: { alignItems: 'center' },
    jobReviewSuccessTitle: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 34,
    },
    jobReviewSuccessDescr: {
      color: colors.muted,
      fontSize: 18,
      textAlign: 'center',
      marginTop: 24,
      lineHeight: 26,
    },
    jobReviewSuccessBtn: {
      marginTop: 28,
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 48,
      minWidth: 200,
      alignItems: 'center',
    },
    jobReviewSuccessBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 18 },
    clubPickRoot: { flex: 1, justifyContent: 'flex-end', elevation: 1000, zIndex: 1000 },
    clubPickSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      maxHeight: '72%',
      borderWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    clubPickTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 12,
    },
    clubPickList: { maxHeight: 320 },
    clubPickRow: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clubPickRowActive: { borderColor: colors.accent },
    clubPickRowPressed: { opacity: 0.9 },
    clubPickRowTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
    clubPickRowSub: { color: colors.muted, fontSize: 13, marginTop: 4 },
    clubPickEmpty: { color: colors.muted, paddingVertical: 16, textAlign: 'center' },
  });
}
