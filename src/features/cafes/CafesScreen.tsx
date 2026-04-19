import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../../components/DinText';
import { TextInput } from '../../components/DinTextInput';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { type BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookingFlowApi, cafesApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { CafeItem } from '../../api/types';
import { FirstHintBanner } from '../../hints/FirstHintBanner';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { loadAppPreferences, patchAppPreferences } from '../../preferences/appPreferences';
import { queryKeys } from '../../query/queryKeys';
import { HallMapPanel } from './HallMapPanel';
import {
  dialPhone,
  openGoogleMapsForAddress,
  openHttpUrl,
  openSystemMapsForAddress,
  openYandexMapsForAddress,
} from './mapLinks';
import { SkeletonBlock } from '../ui/SkeletonBlock';
import { TabSettingsButton } from '../../components/TabSettingsButton';
import { TodaysBookingBanner } from '../booking/TodaysBookingBanner';
import type { MainTabParamList } from '../../navigation/types';

const HEADER_LOGO = require('../../../assets/icon.png') as ImageSourcePropType;

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
}) {
  const { label, value, icon, colors, styles, onPress, isLast } = props;
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
      <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

export function CafesScreen() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByDistance, setSortByDistance] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [jobReviewOpen, setJobReviewOpen] = useState(false);
  const [jobReviewTopic, setJobReviewTopic] = useState('');
  const [jobReviewBody, setJobReviewBody] = useState('');
  const [jobReviewContact, setJobReviewContact] = useState('');

  useEffect(() => {
    void loadAppPreferences().then((p) => setFavoriteId(p.favoriteClubId));
  }, []);

  const catalogHasCoords = useMemo(
    () => (q.data ?? []).some((c) => typeof c.lat === 'number' && typeof c.lng === 'number'),
    [q.data],
  );

  const displayList = useMemo(() => {
    let list = q.data ?? [];
    const qy = searchQuery.trim().toLowerCase();
    if (qy) list = list.filter((c) => c.address.toLowerCase().includes(qy));
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
  }, [q.data, searchQuery, sortByDistance, userPos, catalogHasCoords]);

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
    setJobReviewOpen(false);
  }, []);

  const onJobReviewSubmit = useCallback(() => {
    Alert.alert(t('cafes.jobReview'), t('cafes.jobReviewComingSoon'));
  }, [t]);

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
        <View style={styles.heroShell}>
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
            style={styles.heroStar}
          >
            <MaterialCommunityIcons
              name={fav ? 'star' : 'star-outline'}
              size={26}
              color={colors.text}
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
              void openMapSafe(() => openYandexMapsForAddress(item.address))
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

          <Text style={styles.routeLabel}>{t('cafes.howToGet')}</Text>
          <View style={styles.routeRow}>
            <Pressable
              style={styles.routeBtn}
              onPress={() => void openMapSafe(() => openYandexMapsForAddress(item.address))}
            >
              <Text style={styles.routeBtnText}>{t('cafes.routeYandex')}</Text>
            </Pressable>
            <Pressable
              style={styles.routeBtn}
              onPress={() => void openMapSafe(() => openGoogleMapsForAddress(item.address))}
            >
              <Text style={styles.routeBtnText}>{t('cafes.routeGoogle')}</Text>
            </Pressable>
            <Pressable
              style={styles.routeBtn}
              onPress={() => void openMapSafe(() => openSystemMapsForAddress(item.address))}
            >
              <Text style={styles.routeBtnText}>{t('cafes.routeSystem')}</Text>
            </Pressable>
          </View>

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

  const listFooter = useMemo(
    () => (
      <View style={styles.listFooter}>
        <Pressable
          style={({ pressed }) => [styles.jobReviewBtn, pressed && styles.jobReviewBtnPressed]}
          onPress={() => setJobReviewOpen(true)}
        >
          <Text style={styles.jobReviewBtnText}>{t('cafes.jobReview')}</Text>
        </Pressable>
      </View>
    ),
    [styles.jobReviewBtn, styles.jobReviewBtnPressed, styles.jobReviewBtnText, styles.listFooter, t],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TodaysBookingBanner />
      <View style={styles.header}>
        <Image source={HEADER_LOGO} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.headerSettings}>
          <TabSettingsButton />
        </View>
      </View>

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

      <Modal
        visible={jobReviewOpen}
        animationType="slide"
        transparent
        onRequestClose={closeJobReview}
      >
        <View style={styles.jobModalRoot}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
            onPress={closeJobReview}
            accessibilityRole="button"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.jobModalKeyboard}
          >
            <View
              style={[
                styles.jobModalSheet,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
            <View style={styles.jobModalGrab} />
            <View style={styles.jobModalHeader}>
              <Text style={styles.jobModalTitle}>{t('cafes.jobReview')}</Text>
              <Pressable
                onPress={closeJobReview}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('feedback.dismiss')}
              >
                <MaterialCommunityIcons name="close" size={26} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.jobModalScroll}
            >
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
              style={({ pressed }) => [styles.jobReviewBtn, pressed && styles.jobReviewBtnPressed]}
              onPress={onJobReviewSubmit}
            >
              <Text style={styles.jobReviewBtnText}>{t('cafes.jobReviewSubmit')}</Text>
            </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {mapCafe ? (
        <HallMapPanel cafe={mapCafe} visible onClose={() => setMapCafe(null)} />
      ) : null}
      {q.isLoading ? (
        <SkeletonBlock height={200} colors={colors} />
      ) : q.isError ? (
        <View style={styles.errBox}>
          <Text style={styles.err}>
            {q.error instanceof ApiError ? q.error.message : t('cafes.loadError')}
          </Text>
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
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
    header: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      minHeight: 52,
    },
    headerLogo: { width: 148, height: 52 },
    headerSettings: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
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
    list: { paddingBottom: 32 },
    listFooter: { paddingTop: 8, paddingBottom: 8 },
    clubCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    heroShell: {
      height: 132,
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
    routeLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: 14,
      marginBottom: 8,
    },
    routeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
    jobReviewBtn: {
      marginTop: 4,
      backgroundColor: colors.accent,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 14,
      alignItems: 'center',
    },
    jobReviewBtnPressed: { opacity: 0.92 },
    jobReviewBtnText: { color: colors.accentTextOnButton, fontWeight: '800', fontSize: 16 },
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
    jobModalRoot: { flex: 1, justifyContent: 'flex-end' },
    jobModalKeyboard: { flex: 1, width: '100%', justifyContent: 'flex-end' },
    jobModalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 20,
      paddingTop: 8,
      maxHeight: '88%',
      borderWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    jobModalGrab: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderLight,
      marginBottom: 12,
    },
    jobModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    jobModalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, flex: 1, paddingRight: 12 },
    jobModalScroll: { maxHeight: 420 },
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
  });
}
