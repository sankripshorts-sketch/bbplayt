import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale } from '../../i18n/LocaleContext';
import { useTheme, useThemeColors } from '../../theme';
import { createSettingsStyles, SettingsTile } from './settingsShared';

export function SettingsAppearanceScreen() {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const colors = useThemeColors();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);

  const toggleLocale = () => setLocale(locale === 'ru' ? 'en' : 'ru');
  const cycleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SettingsTile
            styles={styles}
            label={t('profile.theme')}
            value={theme === 'dark' ? t('profile.themeDark') : t('profile.themeLight')}
            onPress={cycleTheme}
            accessibilityHint={t('profile.theme')}
          />
          <SettingsTile
            styles={styles}
            label={t('profile.language')}
            value={locale === 'ru' ? t('profile.langRu') : t('profile.langEn')}
            onPress={toggleLocale}
            accessibilityHint={t('profile.language')}
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
