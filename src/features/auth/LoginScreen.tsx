import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
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

const LOGIN_LOGO = require('../../../assets/auth-login-logo.webp');

const BRAND_LINE_1 = 'BlackBears';
const BRAND_LINE_2 = 'Play';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();
  const { login } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [mainColumnH, setMainColumnH] = useState(() => Math.max(480, Math.round(windowHeight * 0.86)));
  const [formStackHeight, setFormStackHeight] = useState(400);

  const { logoHeight, formPaddingTop } = useMemo(() => {
    const midY = mainColumnH / 2;
    const logoDesired = Math.round(Math.min(windowWidth * 0.88, 560));
    let nextLogoH = logoDesired;
    let padTop = Math.round(midY - formStackHeight / 2 - nextLogoH);
    const minLogo = 96;
    if (padTop < 12) {
      nextLogoH = Math.max(minLogo, Math.round(midY - formStackHeight / 2 - 12));
      padTop = Math.max(12, Math.round(midY - formStackHeight / 2 - nextLogoH));
    }
    return { logoHeight: nextLogoH, formPaddingTop: padTop };
  }, [formStackHeight, mainColumnH, windowWidth]);

  const styles = useMemo(
    () => createStyles(colors, logoHeight, formPaddingTop),
    [colors, logoHeight, formPaddingTop],
  );

  const [loginStr, setLoginStr] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View
          style={styles.mainColumn}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setMainColumnH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
          }}
        >
          <View style={styles.logoSection}>
            <Image
              source={LOGIN_LOGO}
              style={styles.logo}
              contentFit="contain"
              autoplay={false}
              accessibilityRole="image"
              accessibilityLabel={`${BRAND_LINE_1} ${BRAND_LINE_2}`}
            />
          </View>
          <ScrollView
            style={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={styles.formInner}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                setFormStackHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
              }}
            >
              <View style={styles.brandBlock} accessibilityRole="header">
                <Text style={styles.brandLine1}>{BRAND_LINE_1}</Text>
                <Text style={styles.brandLine2}>{BRAND_LINE_2}</Text>
              </View>

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
                onPress={() => navigation.navigate('ForgotPassword')}
                style={({ pressed }) => [styles.forgotLink, pressed && styles.forgotLinkPressed]}
              >
                <Text style={styles.forgotLinkText}>{t('login.forgot.link')}</Text>
              </Pressable>

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

              <Pressable
                onPress={() => navigation.navigate('Register')}
                style={({ pressed }) => [styles.registerButton, pressed && styles.registerButtonPressed]}
              >
                <Text style={styles.registerButtonText}>{t('login.register')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette, logoHeight: number, formPaddingTop: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    mainColumn: {
      flex: 1,
      width: '100%',
    },
    logoSection: {
      width: '100%',
    },
    logo: {
      width: '100%',
      height: logoHeight,
    },
    formScroll: {
      flex: 1,
    },
    formScrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: formPaddingTop,
      paddingBottom: 40,
    },
    formInner: {
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
    },
    brandBlock: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 28,
    },
    brandLine1: {
      fontSize: 30,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      width: '100%',
    },
    brandLine2: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      width: '100%',
      marginTop: 2,
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
    error: {
      color: colors.danger,
      marginBottom: 12,
      textAlign: 'center',
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
    registerButton: {
      marginTop: 18,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.accentBright,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    registerButtonPressed: {
      opacity: 0.88,
    },
    registerButtonText: {
      color: colors.accentBright,
      fontSize: 17,
      fontWeight: '600',
    },
  });
}
