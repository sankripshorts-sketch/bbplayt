import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { TextInput as RnTextInput } from 'react-native';
import { Text } from '../../components/DinText';
import { TextInput } from '../../components/DinTextInput';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { formatPublicErrorMessage } from '../../utils/publicText';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();
  const { login } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loginStr, setLoginStr] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryLogin, setRecoveryLogin] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const passwordRef = useRef<RnTextInput>(null);

  const onSubmit = async () => {
    setError(null);
    if (!loginStr.trim() || !password) {
      setError(t('login.errorCredentials'));
      return;
    }
    setLoading(true);
    try {
      await login(loginStr.trim(), password);
    } catch (e) {
      setError(formatPublicErrorMessage(e, t, 'login.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const onForgotPasswordToggle = () => {
    setForgotOpen((prev) => !prev);
    setRecoveryError(null);
    setRecoverySuccess(null);
  };

  const onRecoverySubmit = async () => {
    const normalizedLogin = recoveryLogin.trim();
    setRecoveryError(null);
    setRecoverySuccess(null);
    if (!normalizedLogin) {
      setRecoveryError(t('login.forgot.errorEmpty'));
      return;
    }
    setRecoveryLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setRecoverySuccess(t('login.forgot.success'));
      setRecoveryLogin('');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
          <Text style={styles.title}>{t('login.title')}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('login.placeholderUser')}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            value={loginStr}
            onChangeText={setLoginStr}
          />
          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordRef}
              style={styles.inputFlex}
              placeholder={t('login.placeholderPassword')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!passwordVisible}
              value={password}
              onChangeText={setPassword}
              accessibilityLabel={t('login.placeholderPassword')}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
            <Pressable
              style={({ pressed }) => [styles.eyeBtn, pressed && styles.eyeBtnPressed]}
              onPress={() => setPasswordVisible((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? t('login.hidePassword') : t('login.showPassword')}
            >
              <MaterialCommunityIcons
                name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.muted}
              />
            </Pressable>
          </View>
          <Pressable
            onPress={onForgotPasswordToggle}
            style={({ pressed }) => [styles.forgotLink, pressed && styles.forgotLinkPressed]}
          >
            <Text style={styles.forgotLinkText}>{t('login.forgot.link')}</Text>
          </Pressable>

          {forgotOpen ? (
            <View style={styles.forgotCard}>
              <Text style={styles.forgotTitle}>{t('login.forgot.title')}</Text>
              <Text style={styles.forgotSubtitle}>{t('login.forgot.subtitle')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('login.forgot.placeholder')}
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                value={recoveryLogin}
                onChangeText={setRecoveryLogin}
                editable={!recoveryLoading}
                returnKeyType="send"
                onSubmitEditing={onRecoverySubmit}
              />
              {recoveryError ? <Text style={styles.error}>{recoveryError}</Text> : null}
              {recoverySuccess ? <Text style={styles.success}>{recoverySuccess}</Text> : null}
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                onPress={onRecoverySubmit}
                disabled={recoveryLoading}
              >
                {recoveryLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('login.forgot.submit')}</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('login.submit')}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.registerLinkText}>{t('login.register')}</Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingVertical: 24,
    },
    inner: {
      paddingHorizontal: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.muted,
      marginBottom: 32,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 12,
      paddingRight: 4,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
    },
    inputFlex: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    eyeBtn: {
      padding: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eyeBtnPressed: { opacity: 0.7 },
    forgotLink: {
      alignSelf: 'flex-end',
      marginBottom: 10,
    },
    forgotLinkPressed: {
      opacity: 0.75,
    },
    forgotLinkText: {
      color: colors.accentBright,
      fontSize: 14,
    },
    forgotCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    forgotTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    forgotSubtitle: {
      color: colors.muted,
      fontSize: 14,
      marginBottom: 10,
    },
    error: {
      color: colors.danger,
      marginBottom: 12,
    },
    success: {
      color: colors.accentBright,
      marginBottom: 12,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    secondaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
    registerLink: { marginTop: 20, alignItems: 'center' },
    registerLinkText: { color: colors.accentBright, fontSize: 16 },
  });
}
