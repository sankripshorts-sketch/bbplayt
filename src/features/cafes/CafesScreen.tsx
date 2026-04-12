import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export function CafesScreen() {
  const { t } = useLocale();
  const colors = useThemeColors();
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

  const renderItem = ({ item }: { item: CafeItem }) => {
    const fav = favoriteId === item.icafe_id;
    const distKm =
      userPos && typeof item.lat === 'number' && typeof item.lng === 'number'
        ? haversineKm(userPos.lat, userPos.lng, item.lat, item.lng)
        : null;
    return (
      <View style={styles.row}>
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.address}</Text>
            <Text style={styles.sub}>
              iCafe ID: {item.icafe_id}
              {distKm != null ? ` · ~${distKm.toFixed(1)} km` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => toggleFavorite(item)}
            accessibilityLabel={t('cafes.favorite')}
            hitSlop={12}
            style={styles.starBtn}
          >
            <MaterialCommunityIcons
              name={fav ? 'star' : 'star-outline'}
              size={28}
              color={fav ? colors.accent : colors.muted}
            />
          </Pressable>
        </View>

        {(item.phone || item.vk_url || item.site) && (
          <View style={styles.contactsRow}>
            {item.phone ? (
              <Pressable
                style={styles.contactChip}
                onPress={async () => {
                  try {
                    await dialPhone(item.phone!);
                  } catch {
                    Alert.alert('', t('cafes.actionFail'));
                  }
                }}
              >
                <MaterialCommunityIcons name="phone" size={18} color={colors.accent} />
                <Text style={styles.contactChipText}>{t('cafes.call')}</Text>
              </Pressable>
            ) : null}
            {item.vk_url ? (
              <Pressable
                style={styles.contactChip}
                onPress={() => void openMapSafe(() => openHttpUrl(item.vk_url!))}
              >
                <MaterialCommunityIcons name="open-in-new" size={18} color={colors.accent} />
                <Text style={styles.contactChipText}>{t('cafes.openVk')}</Text>
              </Pressable>
            ) : null}
            {item.site ? (
              <Pressable
                style={styles.contactChip}
                onPress={() => void openMapSafe(() => openHttpUrl(item.site!))}
              >
                <MaterialCommunityIcons name="web" size={18} color={colors.accent} />
                <Text style={styles.contactChipText}>{t('cafes.openSite')}</Text>
              </Pressable>
            ) : null}
          </View>
        )}

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

        <Pressable style={styles.mapBtn} onPress={() => setMapCafe(item)}>
          <Text style={styles.mapBtnText}>{t('cafes.floorPlan')}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TodaysBookingBanner />
      <View style={styles.titleRow}>
        <Text style={styles.h1}>{t('cafes.title')}</Text>
        <TabSettingsButton />
      </View>
      {icafeQ.data?.icafe_id ? (
        <Text style={styles.hint}>{t('cafes.regHint', { id: icafeQ.data.icafe_id })}</Text>
      ) : icafeQ.isLoading ? (
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
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.accent} />
          <Text style={styles.sortBtnText}>{t('cafes.sortByDistance')}</Text>
        </Pressable>
        {sortByDistance ? (
          <Pressable style={styles.sortBtn} onPress={clearSort}>
            <Text style={styles.sortBtnText}>{t('cafes.sortOff')}</Text>
          </Pressable>
        ) : null}
      </View>

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
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 12,
    },
    h1: { flex: 1, fontSize: 26, fontWeight: '700', color: colors.text },
    hint: { color: colors.accent, fontSize: 14, marginBottom: 12, lineHeight: 20 },
    hintMuted: { color: colors.muted, fontSize: 14, marginBottom: 12 },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
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
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    sortBtnActive: { borderColor: colors.accent },
    sortBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    list: { paddingBottom: 24 },
    row: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
    starBtn: { padding: 4 },
    title: { color: colors.text, fontSize: 17, fontWeight: '600' },
    sub: { color: colors.muted, fontSize: 14, marginTop: 6 },
    contactsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    contactChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contactChipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    routeLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: 12,
      marginBottom: 6,
    },
    routeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    routeBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.accentDim,
    },
    routeBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    mapBtn: {
      alignSelf: 'flex-start',
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: colors.bg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapBtnText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
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
  });
}
