import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../../api/client';
import { requestMemberSms, verifyMemberSms } from '../../api/registrationApi';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterVerify'>;

export function RegisterVerifyScreen({ navigation, route }: Props) {
  const { memberId, privateKey, phone, memberAccount } = route.params;
  const [code, setCode] = useState('');
  const [encodedData, setEncodedData] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number>(0);
  const [loadingSms, setLoadingSms] = useState(true);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, bump] = useState(0);
  useEffect(() => {
    const t = setInterval(() => bump((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const sendSms = useCallback(async () => {
    setError(null);
    setLoadingSms(true);
    try {
      const r = await requestMemberSms(memberId, phone);
      setEncodedData(r.encodedData);
      setResendAt(r.nextRequestSmsTime);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Не удалось запросить SMS';
      setError(msg);
    } finally {
      setLoadingSms(false);
    }
  }, [memberId, phone]);

  useEffect(() => {
    sendSms();
  }, [sendSms]);

  const onVerify = async () => {
    if (!encodedData) {
      setError('Сначала дождитесь SMS или запросите код снова');
      return;
    }
    if (!code.trim()) {
      setError('Введите код из SMS');
      return;
    }
    setError(null);
    setLoadingVerify(true);
    try {
      await verifyMemberSms({
        memberId,
        privateKey,
        encodedData,
        code: code.trim(),
      });
      Alert.alert('Готово', `Аккаунт ${memberAccount} подтверждён. Войдите с паролем.`, [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Ошибка подтверждения';
      setError(msg);
    } finally {
      setLoadingVerify(false);
    }
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const waitLeft = resendAt > nowSec ? resendAt - nowSec : 0;
  const canResendSms = !loadingSms && (!encodedData || waitLeft === 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>Подтверждение телефона</Text>
        <Text style={styles.sub}>
          Код отправлен на {phone}. Аккаунт: {memberAccount}
        </Text>

        {loadingSms ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} /> : null}

        <Text style={styles.label}>Код из SMS</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="000000"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          maxLength={8}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={onVerify}
          disabled={loadingVerify || loadingSms}
        >
          {loadingVerify ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Подтвердить</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.secondary, !canResendSms && styles.secondaryOff]}
          onPress={() => canResendSms && sendSms()}
          disabled={!canResendSms}
        >
          <Text style={styles.secondaryText}>
            {loadingSms
              ? 'Отправка SMS…'
              : !encodedData
                ? 'Запросить SMS'
                : waitLeft > 0
                  ? `Отправить снова через ${waitLeft} с`
                  : 'Отправить код снова'}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>Назад</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  label: { color: colors.muted, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 20,
    color: colors.text,
    letterSpacing: 4,
  },
  error: { color: colors.danger, marginTop: 12 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  pressed: { opacity: 0.88 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 17 },
  secondary: { marginTop: 16, alignItems: 'center' },
  secondaryOff: { opacity: 0.5 },
  secondaryText: { color: colors.accent, fontSize: 15 },
  link: { marginTop: 28, alignItems: 'center' },
  linkText: { color: colors.muted, fontSize: 15 },
});
