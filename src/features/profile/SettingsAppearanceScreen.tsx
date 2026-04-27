import React, { useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import { useTheme, useThemeColors } from '../../theme';
import { createSettingsStyles, SettingsTile } from './settingsShared';

export function SettingsAppearancePanel({ styles }: { styles: ReturnType<typeof createSettingsStyles> }) {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const colors = useThemeColors();

  const toggleLocale = () => setLocale(locale === 'ru' ? 'en' : 'ru');
  const cycleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const isDark = theme === 'dark';

  return (
    <>
      <Pressable
        onPress={cycleTheme}
        accessibilityRole="switch"
        accessibilityLabel={t('profile.theme')}
        accessibilityHint={t('profile.theme')}
        accessibilityState={{ checked: isDark }}
        android_ripple={
          Platform.OS === 'android'
            ? { color: 'rgba(128,128,128,0.25)', borderless: false, radius: 24 }
            : undefined
        }
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      >
        <Text style={styles.tileLabel}>{t('profile.theme')}</Text>
        <Text style={[styles.tileValue, { maxWidth: undefined, flexShrink: 0 }]}>
          {isDark ? t('profile.themeDark') : t('profile.themeLight')}
        </Text>
        <MaterialCommunityIcons
          name={isDark ? 'weather-night' : 'white-balance-sunny'}
          size={18}
          color={isDark ? colors.accent : colors.muted}
        />
        <Switch
          value={isDark}
          onValueChange={cycleTheme}
          thumbColor={Platform.OS === 'android' ? colors.card : undefined}
          trackColor={{ false: colors.border, true: colors.accent }}
          ios_backgroundColor={colors.border}
        />
      </Pressable>
      <SettingsTile
        styles={styles}
        label={t('profile.language')}
        value={locale === 'ru' ? t('profile.langRu') : t('profile.langEn')}
        onPress={toggleLocale}
        accessibilityHint={t('profile.language')}
      />
    </>
  );
}

export function SettingsAppearanceScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SettingsAppearancePanel styles={styles} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
