import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cafesApi } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Text } from '../../components/DinText';
import { useAppAlert } from '../../components/AppAlertContext';
import { FirstHintBanner } from '../../hints/FirstHintBanner';
import { cityDisplayName, isKnownCityId } from '../../config/citiesCatalog';
import { useLocale } from '../../i18n/LocaleContext';
import { loadAppPreferences, type AppPreferences } from '../../preferences/appPreferences';
import { resolveEffectiveCityId } from '../../preferences/effectiveCity';
import { queryKeys } from '../../query/queryKeys';
import { useTheme, useThemeColors } from '../../theme';
import { EditProfileSection } from './EditProfileScreen';
import { faceProfileKey, loadFaceEnrollment, type FaceEnrollment } from './faceEnrollmentStorage';
import {
  loadServiceBindings,
  patchServiceBindings,
  type ServiceBindings,
} from './serviceBindingsStorage';
import { SettingsAppearancePanel } from './SettingsAppearanceScreen';
import { SettingsBookingRemindersPanel } from './SettingsBookingRemindersScreen';
import { SettingsCityPanel } from './SettingsCityScreen';
import { faceEnrollmentSummary, SettingsFacePanel } from './SettingsFaceScreen';
import { createSettingsStyles, SettingsExpandableSection, SettingsTile } from './settingsShared';
import type { ProfileStackParamList } from '../../navigation/types';

type OpenSection = {
  profile: boolean;
  city: boolean;
  face: boolean;
  appearance: boolean;
  reminders: boolean;
  services: boolean;
};

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const route = useRoute();
  const { user, logout } = useAuth();
  const { t, locale } = useLocale();
  const { showAlert } = useAppAlert();
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
    services: false,
  });
  const [serviceBindings, setServiceBindings] = useState<ServiceBindings>({
    steam: false,
    epicGames: false,
  });
  const [serviceActionInProgress, setServiceActionInProgress] = useState<keyof ServiceBindings | null>(null);
  const serviceBindingsRef = useRef<ServiceBindings>(serviceBindings);
  const lastActionTokenRef = useRef<number | null>(null);

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
      void loadServiceBindings().then(setServiceBindings);
    }, [user?.memberId]),
  );

  useEffect(() => {
    serviceBindingsRef.current = serviceBindings;
  }, [serviceBindings]);

  const unlinkService = useCallback(
    (key: keyof ServiceBindings) => {
      if (serviceActionInProgress) return;
      setServiceActionInProgress(key);
      void patchServiceBindings({ [key]: false })
        .then((saved) => {
          setServiceBindings(saved);
          serviceBindingsRef.current = saved;
          showAlert(
            t('profile.serviceUnlinkedTitle'),
            t('profile.serviceUnlinkedBody', {
              service: key === 'steam' ? t('profile.servicesSteam') : t('profile.servicesEpic'),
            }),
          );
        })
        .finally(() => setServiceActionInProgress((current) => (current === key ? null : current)));
    },
    [serviceActionInProgress, showAlert, t],
  );

  const openBindService = useCallback(
    (key: keyof ServiceBindings) => {
      if (serviceActionInProgress) return;
      navigation.navigate('ServiceAuthMock', { serviceKey: key });
    },
    [navigation, serviceActionInProgress],
  );

  useFocusEffect(
    useCallback(() => {
      const params = (route as { params?: ProfileStackParamList['Settings'] }).params;
      if (!params?.actionToken || params.actionToken === lastActionTokenRef.current) return;
      lastActionTokenRef.current = params.actionToken;
      if (params.serviceAction === 'linked' && params.serviceKey) {
        const label = params.serviceKey === 'steam' ? t('profile.servicesSteam') : t('profile.servicesEpic');
        showAlert(t('profile.serviceLinkedTitle'), t('profile.serviceLinkedBody', { service: label }));
      }
    }, [route, showAlert, t]),
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

          <SettingsExpandableSection
            label={t('profile.settingsHubLinkedServices')}
            summary={t('profile.settingsHubLinkedServicesSubtitle')}
            expanded={open.services}
            onToggle={() => toggle('services')}
            styles={styles}
            accessibilityHint={t('profile.settingsExpandHint')}
          >
            <View style={{ gap: 10 }}>
              <FirstHintBanner hintId="profile_services_link" messageKey="hints.profileServicesLink" />
              <Pressable
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed, { marginBottom: 0 }]}
                onPress={() =>
                  serviceBindings.steam ? unlinkService('steam') : openBindService('steam')
                }
                disabled={serviceActionInProgress != null}
                accessibilityRole="button"
                accessibilityState={{ disabled: serviceActionInProgress != null }}
                accessibilityLabel={t('profile.servicesSteam')}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.tileLabel}>{t('profile.servicesSteam')}</Text>
                  </View>
                </View>
                <Text style={styles.tileValue}>
                  {serviceActionInProgress === 'steam'
                    ? t('profile.serviceLinking')
                    : serviceBindings.steam
                      ? t('profile.serviceUnlinkAction')
                      : t('profile.serviceLinkAction')}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed, { marginBottom: 0 }]}
                onPress={() =>
                  serviceBindings.epicGames ? unlinkService('epicGames') : openBindService('epicGames')
                }
                disabled={serviceActionInProgress != null}
                accessibilityRole="button"
                accessibilityState={{ disabled: serviceActionInProgress != null }}
                accessibilityLabel={t('profile.servicesEpic')}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.tileLabel}>{t('profile.servicesEpic')}</Text>
                  </View>
                </View>
                <Text style={styles.tileValue}>
                  {serviceActionInProgress === 'epicGames'
                    ? t('profile.serviceLinking')
                    : serviceBindings.epicGames
                      ? t('profile.serviceUnlinkAction')
                      : t('profile.serviceLinkAction')}
                </Text>
              </Pressable>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                {t('profile.serviceLocalHint')}
              </Text>
            </View>
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
