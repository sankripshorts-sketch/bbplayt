import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppAlert } from '../../components/AppAlertContext';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import type { ProfileStackParamList } from '../../navigation/types';
import { patchServiceBindings } from './serviceBindingsStorage';
import { createSettingsStyles } from './settingsShared';
import { useThemeColors } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ServiceAuthMock'>;

export function ServiceAuthMockScreen({ navigation, route }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);
  const { showAlert } = useAppAlert();
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const serviceKey = route.params.serviceKey;
  const serviceLabel = serviceKey === 'steam' ? t('profile.servicesSteam') : t('profile.servicesEpic');

  const onSubmit = async () => {
    if (submitting) return;
    if (!name.trim() || !login.trim() || !password.trim()) {
      showAlert(t('profile.serviceAuthRequiredTitle'), t('profile.serviceAuthRequiredBody'));
      return;
    }
    setSubmitting(true);
    try {
      await patchServiceBindings({ [serviceKey]: true });
      navigation.navigate('Settings', {
        serviceAction: 'linked',
        serviceKey,
        actionToken: Date.now(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[localStyles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={localStyles.sectionLabel}>{serviceLabel}</Text>
            <Text style={[localStyles.hint, { color: colors.muted }]}>
              {t('profile.serviceAuthHint', { service: serviceLabel })}
            </Text>
            <View style={localStyles.form}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('profile.serviceAuthName')}
                placeholderTextColor={colors.muted}
                style={[localStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              />
              <TextInput
                value={login}
                onChangeText={setLogin}
                placeholder={t('profile.serviceAuthLogin')}
                placeholderTextColor={colors.muted}
                style={[localStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                autoCapitalize="none"
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('profile.serviceAuthPassword')}
                placeholderTextColor={colors.muted}
                style={[localStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                secureTextEntry
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                localStyles.submitBtn,
                { backgroundColor: colors.accentBright },
                pressed && localStyles.submitBtnPressed,
              ]}
              onPress={() => void onSubmit()}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting }}
              accessibilityLabel={t('profile.serviceAuthSignIn')}
            >
              <Text style={localStyles.submitBtnText}>
                {submitting ? t('profile.serviceLinking') : t('profile.serviceAuthSignIn')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 12,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  submitBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnPressed: {
    opacity: 0.9,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
