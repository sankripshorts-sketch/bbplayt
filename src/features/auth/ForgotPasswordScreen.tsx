import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../components/DinText';
import { TextInput } from '../../components/DinTextInput';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [recoveryLogin, setRecoveryLogin] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

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
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.backRow, pressed && styles.backRowPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('login.forgot.back')}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color={colors.accentBright} />
              <Text style={styles.backText}>{t('login.forgot.back')}</Text>
            </Pressable>

            <Text style={styles.title}>{t('login.forgot.title')}</Text>
            <Text style={styles.subtitle}>{t('login.forgot.subtitle')}</Text>

            <TextInput
              style={styles.input}
              placeholder={t('login.forgot.placeholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              value={recoveryLogin}
              onChangeText={setRecoveryLogin}
              editable={!recoveryLoading}
              returnKeyType="send"
              onSubmitEditing={onRecoverySubmit}
            />
            {recoveryError ? <Text style={styles.error}>{recoveryError}</Text> : null}
            {recoverySuccess ? <Text style={styles.success}>{recoverySuccess}</Text> : null}
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
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
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: 20,
      gap: 2,
    },
    backRowPressed: { opacity: 0.75 },
    backText: {
      color: colors.accentBright,
      fontSize: 16,
      fontWeight: '600',
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
    buttonPressed: {
      opacity: 0.85,
    },
    buttonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
  });
}
