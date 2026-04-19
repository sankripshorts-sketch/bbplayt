import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import type { ProfileStackParamList } from '../../navigation/types';
import { useTheme, useThemeColors } from '../../theme';
import { createSettingsStyles, SettingsTile } from './settingsShared';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, logout } = useAuth();
  const { t, locale } = useLocale();
  const { theme } = useTheme();
  const colors = useThemeColors();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);

  const appearanceSummary = [
    theme === 'dark' ? t('profile.themeDark') : t('profile.themeLight'),
    locale === 'ru' ? t('profile.langRu') : t('profile.langEn'),
  ].join(' · ');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {user?.memberId ? (
            <SettingsTile
              styles={styles}
              label={t('profile.sectionProfile')}
              value={t('profile.editProfileSubtitle')}
              onPress={() => navigation.navigate('EditProfile')}
              accessibilityHint={t('profile.editProfile')}
            />
          ) : null}

          <SettingsTile
            styles={styles}
            label={t('profile.sectionAppearance')}
            value={appearanceSummary}
            onPress={() => navigation.navigate('SettingsAppearance')}
            accessibilityHint={t('profile.sectionAppearance')}
          />

          <SettingsTile
            styles={styles}
            label={t('profile.settingsHubBookingReminders')}
            value=""
            onPress={() => navigation.navigate('SettingsBookingReminders')}
            accessibilityHint={t('profile.settingsHubBookingReminders')}
          />
        </ScrollView>

        {user?.memberId ? (
          <View style={styles.logoutBlock}>
            <SettingsTile
              styles={styles}
              label={t('profile.logout')}
              value=""
              onPress={() => void logout()}
              destructive
              accessibilityHint={t('profile.logout')}
            />
          </View>
        ) : null}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
