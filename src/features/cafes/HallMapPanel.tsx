import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/DinText';
import { useQuery } from '@tanstack/react-query';
import { bookingFlowApi } from '../../api/endpoints';
import { queryKeys } from '../../query/queryKeys';
import { ApiError } from '../../api/client';
import type { CafeItem } from '../../api/types';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { ClubLayoutCanvas } from './ClubLayoutCanvas';
import type { PcAvailabilityState } from './clubLayoutGeometry';
import { SkeletonBlock } from '../ui/SkeletonBlock';
import { useLivePcsQuery } from '../booking/useLivePcsQuery';

type Props = {
  cafe: CafeItem;
  visible: boolean;
  onClose: () => void;
};

export function HallMapPanel({ cafe, visible, onClose }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
            <SkeletonBlock height={220} colors={colors} />
          </View>
        ) : q.isError ? (
          <Text style={styles.err}>
            {q.error instanceof ApiError ? q.error.message : t('hallMap.loadError')}
          </Text>
        ) : q.data?.rooms?.length ? (
          <ScrollView
            style={styles.mapBodyScroll}
            contentContainerStyle={styles.mapBodyContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <Text style={styles.liveHint}>{t('hallMap.liveLegend')}</Text>
            <ClubLayoutCanvas
              rooms={q.data.rooms}
              colors={colors}
              icafeId={cafe.icafe_id}
              pcAvailability={liveQ.isError ? undefined : pcAvailability}
              horizontalPadding={12}
              minHeight={300}
              embedPreviewChrome
            />
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
    mapBodyScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
    mapBodyContent: { paddingBottom: 28 },
    liveHint: { fontSize: 12, color: colors.muted, marginBottom: 8, lineHeight: 17 },
    skeletonWrap: { padding: 16 },
    err: { color: colors.danger, padding: 20 },
    empty: { color: colors.muted, padding: 20 },
  });
}
