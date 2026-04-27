import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../../components/DinText';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { type BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { bookingFlowApi } from '../../api/endpoints';
import { getHallMapTweak } from '../../config/clubLayoutConfig';
import { queryKeys } from '../../query/queryKeys';
import type { CafeItem } from '../../api/types';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import type { MainTabParamList } from '../../navigation/types';
import { ClubLayoutCanvas } from './ClubLayoutCanvas';
import { HallMapStatusLegend } from './HallMapStatusLegend';
import type { PcAvailabilityState } from './clubLayoutGeometry';
import { ClubDataLoader } from '../ui/ClubDataLoader';
import { useLivePcsQuery } from '../booking/useLivePcsQuery';
import { formatPublicErrorMessage } from '../../utils/publicText';

type Props = {
  cafe: CafeItem;
  visible: boolean;
  onClose: () => void;
};

export function HallMapPanel({ cafe, visible, onClose }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { width: windowW } = useWindowDimensions();
  const scrollHPad = useMemo(() => {
    if (windowW < 340) return 14;
    if (windowW < 400) return 18;
    return 24;
  }, [windowW]);

  const q = useQuery({
    queryKey: queryKeys.structRooms(cafe.icafe_id),
    queryFn: () => bookingFlowApi.structRooms(cafe.icafe_id),
    enabled: visible,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const liveQ = useLivePcsQuery(cafe.icafe_id, visible);

  const liveByName = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const p of liveQ.data ?? []) {
      m.set(String(p.pc_name).trim().toLowerCase(), !!p.is_using);
    }
    return m;
  }, [liveQ.data]);

  const pcAvailability = useMemo(() => {
    const map: Record<string, PcAvailabilityState> = {};
    const rooms = q.data?.rooms ?? [];
    for (const r of rooms) {
      for (const pc of r.pcs_list ?? []) {
        const lk = String(pc.pc_name).trim().toLowerCase();
        const on = liveByName.get(lk);
        map[pc.pc_name] = on ? 'liveBusy' : 'free';
      }
    }
    return map;
  }, [q.data?.rooms, liveByName]);

  const hallMapCanonicalLayout = useMemo(
    () => getHallMapTweak(cafe.icafe_id).canonicalColumns?.enabled === true,
    [cafe.icafe_id],
  );

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {t('hallMap.title', { address: cafe.address })}
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>{t('hallMap.close')}</Text>
          </Pressable>
        </View>

        {q.isLoading ? (
          <View style={styles.skeletonWrap}>
            <ClubDataLoader message={t('common.loader.captionPc')} compact minHeight={220} />
          </View>
        ) : q.isError ? (
          <Text style={styles.err}>{formatPublicErrorMessage(q.error, t, 'hallMap.loadError')}</Text>
        ) : q.data?.rooms?.length ? (
          <ScrollView
            style={styles.mapBodyScroll}
            contentContainerStyle={styles.mapBodyContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <ClubLayoutCanvas
              rooms={q.data.rooms}
              colors={colors}
              icafeId={cafe.icafe_id}
              pcAvailability={liveQ.isError ? undefined : pcAvailability}
              horizontalPadding={scrollHPad * 2}
              minHeight={hallMapCanonicalLayout ? 220 : 260}
              bookingCompact
            />
            {hallMapCanonicalLayout ? (
              <HallMapStatusLegend variant="booking" />
            ) : (
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.pcBusy }]} />
                  <Text style={styles.legendText}>{t('hallMap.legendBusy')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.pcSelected }]} />
                  <Text style={styles.legendText}>{t('hallMap.legendSelected')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.pcFree },
                    ]}
                  />
                  <Text style={styles.legendText}>{t('booking.legendFree')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.pcUnavailable }]} />
                  <Text style={styles.legendText}>{t('hallMap.legendUnavailable')}</Text>
                </View>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [styles.bookPrimary, pressed && styles.bookPrimaryPressed]}
              onPress={() => {
                navigation.navigate('Booking', { prefill: { icafeId: cafe.icafe_id } });
                onClose();
              }}
            >
              <Text style={styles.bookPrimaryText}>{t('booking.bookingLine1Short')}</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <Text style={styles.empty}>{t('hallMap.emptyZones')}</Text>
        )}
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    modalRoot: { flex: 1, backgroundColor: colors.bg, paddingTop: 8 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600', marginRight: 8 },
    closeBtn: {
      minHeight: 44,
      minWidth: 44,
      paddingVertical: 8,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    closeText: { color: colors.accentBright, fontWeight: '600' },
    mapBodyScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
    mapBodyContent: { paddingBottom: 20 },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      rowGap: 8,
      marginTop: 8,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 12, height: 12, borderRadius: 3 },
    legendText: { fontSize: 12, color: colors.muted },
    bookPrimary: {
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookPrimaryPressed: { opacity: 0.88 },
    bookPrimaryText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 15 },
    skeletonWrap: { padding: 16 },
    err: { color: colors.danger, padding: 20 },
    empty: { color: colors.muted, padding: 20 },
  });
}
