import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingFlowApi, cafesApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { CafeItem } from '../../api/types';
import { HallMapPanel } from './HallMapPanel';
import { colors } from '../../theme';

export function CafesScreen() {
  const q = useQuery({
    queryKey: ['cafes'],
    queryFn: () => cafesApi.list(),
  });
  const icafeQ = useQuery({
    queryKey: ['icafe-id-for-member'],
    queryFn: () => bookingFlowApi.icafeIdForMember(),
  });
  const [mapCafe, setMapCafe] = useState<CafeItem | null>(null);

  const renderItem = ({ item }: { item: CafeItem }) => (
    <View style={styles.row}>
      <Text style={styles.title}>{item.address}</Text>
      <Text style={styles.sub}>iCafe ID: {item.icafe_id}</Text>
      <Pressable style={styles.mapBtn} onPress={() => setMapCafe(item)}>
        <Text style={styles.mapBtnText}>Схема зала</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.h1}>Клубы</Text>
      {icafeQ.data?.icafe_id ? (
        <Text style={styles.hint}>
          Регистрация клиентов (iCafe для /members): {icafeQ.data.icafe_id}
        </Text>
      ) : icafeQ.isLoading ? (
        <Text style={styles.hint}>Загрузка icafe-id-for-member…</Text>
      ) : icafeQ.isError ? (
        <Text style={styles.hintMuted}>icafe-id-for-member недоступен</Text>
      ) : null}
      {mapCafe ? (
        <HallMapPanel cafe={mapCafe} visible onClose={() => setMapCafe(null)} />
      ) : null}
      {q.isLoading ? (
        <ActivityIndicator color={colors.accent} size="large" />
      ) : q.isError ? (
        <Text style={styles.err}>
          {q.error instanceof ApiError ? q.error.message : 'Не удалось загрузить список'}
        </Text>
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(item) => String(item.icafe_id)}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>Список пуст</Text>}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  h1: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  hint: { color: colors.accent, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  hintMuted: { color: colors.muted, fontSize: 13, marginBottom: 12 },
  list: { paddingBottom: 24 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  sub: { color: colors.muted, fontSize: 13, marginTop: 6 },
  mapBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.accentDim,
    borderRadius: 10,
  },
  mapBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  err: { color: colors.danger },
  empty: { color: colors.muted },
});
