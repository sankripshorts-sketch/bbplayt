import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingFlowApi, cafesApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { CafeItem, PcListItem, ProductItem } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme';

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextHourTime(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function BookingScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const cafesQ = useQuery({
    queryKey: ['cafes'],
    queryFn: () => cafesApi.list(),
  });

  const [cafe, setCafe] = useState<CafeItem | null>(null);
  const [dateStart, setDateStart] = useState(todayISODate);
  const [timeStart, setTimeStart] = useState(nextHourTime());
  const [mins, setMins] = useState('60');
  const [isFindWindow, setIsFindWindow] = useState(true);
  const [priceName, setPriceName] = useState('');
  const [pcs, setPcs] = useState<PcListItem[] | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);

  const memberIdOk = useMemo(() => user?.memberId && /^\d+$/.test(user.memberId), [user?.memberId]);

  const pricesQ = useMutation({
    mutationFn: () => {
      if (!cafe) throw new Error('Выберите клуб');
      return bookingFlowApi.allPrices({
        cafeId: cafe.icafe_id,
        memberId: user?.memberId,
        mins: Number(mins) || 60,
        bookingDate: dateStart,
      });
    },
    onSuccess: (data) => {
      setProducts(data.products ?? []);
      if (data.products?.length && !priceName) {
        setPriceName(data.products[0].product_name);
      }
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Ошибка';
      Alert.alert('Тарифы', msg);
    },
  });

  const loadPcs = useMutation({
    mutationFn: () => {
      if (!cafe) throw new Error('Выберите клуб');
      const m = Number(mins);
      if (!Number.isFinite(m) || m <= 0) throw new Error('Укажите длительность (мин)');
      return bookingFlowApi.availablePcs({
        cafeId: cafe.icafe_id,
        dateStart,
        timeStart,
        mins: m,
        isFindWindow,
        priceName: priceName.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      setPcs(data.pc_list ?? []);
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Ошибка';
      Alert.alert('ПК', msg);
    },
  });

  const booksQ = useQuery({
    queryKey: ['books', user?.memberAccount],
    queryFn: () => bookingFlowApi.memberBooks(user?.memberAccount),
    enabled: !!user?.memberAccount,
  });

  const bookMut = useMutation({
    mutationFn: async (pc: PcListItem) => {
      if (!cafe || !user) throw new Error('Нет данных');
      if (!memberIdOk) throw new Error('Нет числового member_id — повторите вход или проверьте ответ API.');
      const m = Number(mins);
      return bookingFlowApi.createBooking({
        icafe_id: cafe.icafe_id,
        pc_name: pc.pc_name,
        member_account: user.memberAccount,
        member_id: user.memberId,
        start_date: dateStart,
        start_time: timeStart,
        mins: m,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] });
      Alert.alert('Бронирование', 'Запрос отправлен.');
      loadPcs.mutate();
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Ошибка';
      Alert.alert('Бронирование', msg);
    },
  });

  const cafes = cafesQ.data ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Бронирование</Text>
        {!memberIdOk ? (
          <Text style={styles.warn}>
            В сессии нет числового member_id (нужен для /booking). Проверьте ответ POST /login или
            обратитесь к бэкенду.
          </Text>
        ) : null}

        <Text style={styles.label}>Клуб</Text>
        <View style={styles.chips}>
          {cafes.map((c) => (
            <Pressable
              key={c.icafe_id}
              onPress={() => setCafe(c)}
              style={[styles.chip, cafe?.icafe_id === c.icafe_id && styles.chipOn]}
            >
              <Text style={[styles.chipText, cafe?.icafe_id === c.icafe_id && styles.chipTextOn]}>
                {c.address}
              </Text>
            </Pressable>
          ))}
        </View>
        {cafesQ.isLoading ? <ActivityIndicator color={colors.accent} /> : null}

        <Text style={styles.label}>Дата (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={dateStart}
          onChangeText={setDateStart}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Время начала (HH:mm)</Text>
        <TextInput
          style={styles.input}
          value={timeStart}
          onChangeText={setTimeStart}
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Длительность (мин)</Text>
        <TextInput
          style={styles.input}
          value={mins}
          onChangeText={setMins}
          keyboardType="number-pad"
          placeholderTextColor={colors.muted}
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Искать ближайшее окно</Text>
          <Switch value={isFindWindow} onValueChange={setIsFindWindow} />
        </View>

        <Text style={styles.label}>Пакет (product_name), опционально</Text>
        <TextInput
          style={styles.input}
          value={priceName}
          onChangeText={setPriceName}
          placeholder="например: 3 часа/пакет"
          placeholderTextColor={colors.muted}
        />

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={() => pricesQ.mutate()}
          disabled={!cafe || pricesQ.isPending}
        >
          {pricesQ.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Загрузить тарифы / пакеты</Text>
          )}
        </Pressable>

        {products.length > 0 ? (
          <View style={styles.pkgBox}>
            <Text style={styles.sub}>Пакеты (нажмите, чтобы подставить имя)</Text>
            {products.slice(0, 8).map((p) => (
              <Pressable key={p.product_id} onPress={() => setPriceName(p.product_name)}>
                <Text style={styles.pkg}>{p.product_name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={() => loadPcs.mutate()}
          disabled={!cafe || loadPcs.isPending}
        >
          {loadPcs.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Проверить доступные ПК</Text>
          )}
        </Pressable>

        {pcs
          ? pcs.map((item, index) => (
              <View style={styles.pcRow} key={`${item.pc_name}-${index}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pcName}>{item.pc_name}</Text>
                  <Text style={styles.pcSub}>
                    {item.pc_area_name} · {item.is_using ? 'занят' : 'свободен'}
                  </Text>
                </View>
                <Pressable
                  style={[styles.smallBtn, item.is_using && styles.smallBtnOff]}
                  disabled={item.is_using || bookMut.isPending || !memberIdOk}
                  onPress={() => bookMut.mutate(item)}
                >
                  <Text style={styles.smallBtnText}>Бронь</Text>
                </Pressable>
              </View>
            ))
          : null}

        <Text style={styles.h2}>Мои брони</Text>
        {booksQ.isLoading ? (
          <ActivityIndicator color={colors.muted} />
        ) : booksQ.data ? (
          Object.entries(booksQ.data).map(([icafe, rows]) => (
            <View key={icafe} style={styles.bookBlock}>
              <Text style={styles.icafe}>Клуб {icafe}</Text>
              {rows.map((r, i) => (
                <Text key={i} style={styles.bookLine}>
                  {r.product_pc_name}: {r.product_available_date_local_from} —{' '}
                  {r.product_available_date_local_to}
                </Text>
              ))}
            </View>
          ))
        ) : (
          <Text style={styles.muted}>Нет данных</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 48 },
  h1: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 12 },
  h2: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 20, marginBottom: 8 },
  warn: { color: colors.danger, marginBottom: 12, lineHeight: 20 },
  label: { color: colors.muted, marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.text,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '100%',
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  chipText: { color: colors.muted, fontSize: 13 },
  chipTextOn: { color: '#fff' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  pressed: { opacity: 0.88 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pkgBox: { marginTop: 12 },
  sub: { color: colors.muted, marginBottom: 6, fontSize: 13 },
  pkg: { color: colors.accent, marginBottom: 4, fontSize: 14 },
  pcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pcName: { color: colors.text, fontWeight: '700', fontSize: 16 },
  pcSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  smallBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallBtnOff: { opacity: 0.4 },
  smallBtnText: { color: '#fff', fontWeight: '600' },
  bookBlock: { marginBottom: 12 },
  icafe: { color: colors.text, fontWeight: '600', marginBottom: 4 },
  bookLine: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  muted: { color: colors.muted },
});
