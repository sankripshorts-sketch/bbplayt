import Constants from 'expo-constants';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const topUpUrl = useMemo(() => {
    const extra = Constants.expoConfig?.extra as { topUpUrl?: string } | undefined;
    return extra?.topUpUrl || 'https://bbgms.link/bbplay/ru';
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Профиль</Text>
        <View style={styles.card}>
          <Row label="Аккаунт" value={user?.memberAccount ?? '—'} />
          <Row label="ID (member_id)" value={user?.memberId ?? '—'} />
          {user?.balanceRub !== undefined ? (
            <Row label="Баланс" value={`${user.balanceRub.toFixed(2)} ₽`} />
          ) : (
            <Text style={styles.hint}>
              Баланс не пришёл в ответе логина. Смотрите баланс в клубе или в личном кабинете iCafe.
            </Text>
          )}
        </View>
        <Pressable onPress={() => setTopUpOpen(true)} style={styles.topUp}>
          <Text style={styles.topUpText}>Пополнить баланс в приложении</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(topUpUrl)}
          style={styles.topUpOutline}
        >
          <Text style={styles.topUpOutlineText}>Открыть в браузере</Text>
        </Pressable>
        <Pressable onPress={() => logout()} style={styles.out}>
          <Text style={styles.outText}>Выйти</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={topUpOpen} animationType="slide" onRequestClose={() => setTopUpOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalBar}>
            <Text style={styles.modalTitle}>Пополнение</Text>
            <Pressable onPress={() => setTopUpOpen(false)} hitSlop={12}>
              <Text style={styles.modalClose}>Готово</Text>
            </Pressable>
          </View>
          <WebView
            source={{ uri: topUpUrl }}
            style={styles.web}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webLoading}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            )}
            userAgent="Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  row: { marginBottom: 14 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  value: { color: colors.text, fontSize: 17, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  topUp: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  topUpText: { color: '#fff', fontWeight: '600' },
  topUpOutline: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  topUpOutlineText: { color: colors.muted, fontWeight: '600' },
  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  modalClose: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  web: { flex: 1, backgroundColor: colors.bg },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  out: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outText: { color: colors.danger, fontWeight: '600' },
});
