import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cafesApi } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { cityDisplayName, isKnownCityId } from '../../config/citiesCatalog';
import { useLocale } from '../../i18n/LocaleContext';
import { loadAppPreferences, type AppPreferences } from '../../preferences/appPreferences';
import { resolveEffectiveCityId } from '../../preferences/effectiveCity';
import { queryKeys } from '../../query/queryKeys';
import { useTheme, useThemeColors } from '../../theme';
import { EditProfileSection } from './EditProfileScreen';
import { faceProfileKey, loadFaceEnrollment, type FaceEnrollment } from './faceEnrollmentStorage';
import { SettingsAppearancePanel } from './SettingsAppearanceScreen';
import { SettingsBookingRemindersPanel } from './SettingsBookingRemindersScreen';
import { SettingsCityPanel } from './SettingsCityScreen';
import { faceEnrollmentSummary, SettingsFacePanel } from './SettingsFaceScreen';
import { createSettingsStyles, SettingsExpandableSection, SettingsTile } from './settingsShared';

type OpenSection = {
  profile: boolean;
  city: boolean;
  face: boolean;
  appearance: boolean;
  reminders: boolean;
};

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { t, locale } = useLocale();
  const { theme } = useTheme();
  const colors = useThemeColors();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);
  const [prefs, setPrefs] = useState<AppPreferences | null>(null);
  const [faceEnrollment, setFaceEnrollment] = useState<FaceEnrollment | null>(null);
  const [open, setOpen] = useState<OpenSection>({
    profile: false,
    city: false,
    face: false,
    appearance: false,
    reminders: false,
  });

  const toggle = useCallback((key: keyof OpenSection) => {
    setOpen((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  const syncPrefs = useCallback(() => {
    void loadAppPreferences().then(setPrefs);
  }, []);

  const syncFaceEnrollment = useCallback(() => {
    void loadFaceEnrollment(faceProfileKey(user?.memberId)).then(setFaceEnrollment);
  }, [user?.memberId]);

  const cafesQ = useQuery({
    queryKey: queryKeys.cafes(),
    queryFn: () => cafesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  useFocusEffect(
    useCallback(() => {
      void loadAppPreferences().then(setPrefs);
      void loadFaceEnrollment(faceProfileKey(user?.memberId)).then(setFaceEnrollment);
    }, [user?.memberId]),
  );

  const appearanceSummary = [
    theme === 'dark' ? t('profile.themeDark') : t('profile.themeLight'),
    locale === 'ru' ? t('profile.langRu') : t('profile.langEn'),
  ].join(' · ');

  const loc = locale === 'en' ? 'en' : 'ru';

  const citySummary = useMemo(() => {
    if (!prefs) return t('profile.settingsHubCitySubtitle');
    const effectiveId = resolveEffectiveCityId(prefs, cafesQ.data);
    if (prefs.cityIdManual && isKnownCityId(prefs.cityIdManual)) {
      return `${cityDisplayName(prefs.cityIdManual, loc)} · ${t('profile.settingsHubCitySubtitle')}`;
    }
    if (!effectiveId) return t('profile.settingsHubCitySubtitle');
    return `${t('profile.cityModeAuto')} · ${cityDisplayName(effectiveId, loc)}`;
  }, [prefs, cafesQ.data, loc, t]);

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
          {user?.memberId && faceEnrollment?.captures?.center?.uri ? (
            <View style={styles.settingsFacePhotoWrap} accessibilityLabel={t('profile.facePreviewA11y')}>
              <Image
                source={{ uri: faceEnrollment.captures.center.uri }}
                style={styles.settingsFacePhoto}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={120}
              />
            </View>
          ) : null}

          {user?.memberId ? (
            <SettingsExpandableSection
              label={t('profile.sectionProfile')}
              summary={t('profile.editProfileSubtitle')}
              expanded={open.profile}
              onToggle={() => toggle('profile')}
              styles={styles}
              accessibilityHint={t('profile.settingsExpandHint')}
            >
              <EditProfileSection />
            </SettingsExpandableSection>
          ) : null}

          {user?.memberId ? (
            <SettingsExpandableSection
              label={t('profile.sectionFace')}
              summary={faceEnrollmentSummary(t, faceEnrollment)}
              expanded={open.face}
              onToggle={() => toggle('face')}
              styles={styles}
              accessibilityHint={t('profile.settingsExpandHint')}
            >
              <SettingsFacePanel styles={styles} onChanged={syncFaceEnrollment} />
            </SettingsExpandableSection>
          ) : null}

          <SettingsExpandableSection
            label={t('profile.settingsHubCity')}
            summary={citySummary}
            expanded={open.city}
            onToggle={() => toggle('city')}
            styles={styles}
            accessibilityHint={t('profile.settingsExpandHint')}
          >
            <SettingsCityPanel styles={styles} onPatched={syncPrefs} />
          </SettingsExpandableSection>

          <SettingsExpandableSection
            label={t('profile.sectionAppearance')}
            summary={appearanceSummary}
            expanded={open.appearance}
            onToggle={() => toggle('appearance')}
            styles={styles}
            accessibilityHint={t('profile.settingsExpandHint')}
          >
            <SettingsAppearancePanel styles={styles} />
          </SettingsExpandableSection>

          <SettingsExpandableSection
            label={t('profile.settingsHubBookingReminders')}
            summary=""
            expanded={open.reminders}
            onToggle={() => toggle('reminders')}
            styles={styles}
            accessibilityHint={t('profile.settingsExpandHint')}
          >
            <SettingsBookingRemindersPanel styles={styles} />
          </SettingsExpandableSection>
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
