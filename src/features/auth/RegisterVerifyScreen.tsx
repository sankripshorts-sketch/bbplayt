import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Text } from '../../components/DinText';
import { TextInput } from '../../components/DinTextInput';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestMemberSms, verifyMemberSms } from '../../api/registrationApi';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useLocale } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/messagesRu';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { formatPublicErrorMessage } from '../../utils/publicText';

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterVerify'>;

/** Тик только внутри кнопки — экран с полем кода не ре-рендерится каждую секунду (иначе на Android падает фокус/клава). */
function VerifyResendControl({
  loadingSms,
  resendAt,
  onResend,
  t,
  secondaryStyle,
  secondaryOffStyle,
  secondaryTextStyle,
}: {
  loadingSms: boolean;
  resendAt: number;
  onResend: () => void;
  t: (k: MessageKey, vars?: Record<string, string | number>) => string;
  secondaryStyle: object;
  secondaryOffStyle: object;
  secondaryTextStyle: object;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const nowMs = Date.now();
  const waitLeft = resendAt > nowMs ? Math.ceil((resendAt - nowMs) / 1000) : 0;
  const canResendSms = !loadingSms && waitLeft === 0;

  const secondaryLabel = loadingSms
    ? t('verify.sendingSms')
    : waitLeft > 0
      ? t('verify.resendIn', { sec: waitLeft })
      : t('verify.resend');

  return (
    <Pressable
      style={[secondaryStyle, !canResendSms && secondaryOffStyle]}
      onPress={() => canResendSms && onResend()}
      disabled={!canResendSms}
    >
      <Text style={secondaryTextStyle}>{secondaryLabel}</Text>
    </Pressable>
  );
}

export function RegisterVerifyScreen({ navigation, route }: Props) {
  const { memberId, privateKey, phone, memberAccount } = route.params;
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [code, setCode] = useState('');
  const [encodedData, setEncodedData] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number>(0);
  const [loadingSms, setLoadingSms] = useState(true);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendSms = useCallback(async () => {
    setError(null);
    setLoadingSms(true);
    try {
      const r = await requestMemberSms(memberId, phone);
      setEncodedData(r.encodedData);
      setResendAt(r.nextRequestSmsTime);
    } catch (e) {
      setError(formatPublicErrorMessage(e, t, 'verify.errorSms'));
    } finally {
      setLoadingSms(false);
    }
  }, [memberId, phone, t]);

  useEffect(() => {
    sendSms();
  }, [sendSms]);

  const onVerify = async () => {
    if (!code.trim()) {
      setError(t('verify.errorCode'));
      return;
    }
    setError(null);
    setLoadingVerify(true);
    try {
      await verifyMemberSms({
        memberId,
        privateKey,
        encodedData: encodedData ?? '',
        code: code.trim(),
      });
      Alert.alert(t('verify.alertTitle'), t('verify.alertBody', { account: memberAccount }), [
        { text: t('verify.alertOk'), onPress: () => navigation.popToTop() },
      ]);
    } catch (e) {
      setError(formatPublicErrorMessage(e, t, 'verify.errorGeneric'));
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>{t('verify.title')}</Text>
        <Text style={styles.sub}>{t('verify.sub', { phone, account: memberAccount })}</Text>

        {loadingSms ? <ActivityIndicator color={colors.accentBright} style={{ marginVertical: 16 }} /> : null}

        <Text style={styles.label}>{t('verify.labelCode')}</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder={t('verify.placeholderCode')}
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
            <Text style={styles.buttonText}>{t('verify.submit')}</Text>
          )}
        </Pressable>

        <VerifyResendControl
          loadingSms={loadingSms}
          resendAt={resendAt}
          onResend={sendSms}
          t={t}
          secondaryStyle={styles.secondary}
          secondaryOffStyle={styles.secondaryOff}
          secondaryTextStyle={styles.secondaryText}
        />

        <Pressable onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>{t('verify.back')}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
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
    secondaryText: { color: colors.accentBright, fontSize: 15 },
    link: { marginTop: 28, alignItems: 'center' },
    linkText: { color: colors.muted, fontSize: 15 },
  });
}
