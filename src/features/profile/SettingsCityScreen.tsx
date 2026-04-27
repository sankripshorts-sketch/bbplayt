import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cafesApi } from '../../api/endpoints';
import { BB_CITIES, cityDisplayName, isKnownCityId } from '../../config/citiesCatalog';
import { useLocale } from '../../i18n/LocaleContext';
import { loadAppPreferences, patchAppPreferences, type AppPreferences } from '../../preferences/appPreferences';
import { resolveEffectiveCityId } from '../../preferences/effectiveCity';
import { queryKeys } from '../../query/queryKeys';
import { useThemeColors } from '../../theme';
import { createSettingsStyles, SettingsTile } from './settingsShared';

export function SettingsCityPanel({
  styles,
  onPatched,
}: {
  styles: ReturnType<typeof createSettingsStyles>;
  /** Вызвать после сохранения города (чтобы шапка на экране настроек обновила сводку). */
  onPatched?: () => void;
}) {
  const { t, locale } = useLocale();
  const [prefs, setPrefs] = useState<AppPreferences | null>(null);

  const cafesQ = useQuery({
    queryKey: queryKeys.cafes(),
    queryFn: () => cafesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const reload = useCallback(() => {
    void loadAppPreferences().then(setPrefs);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const effectiveId = useMemo(() => {
    if (!prefs) return '';
    return resolveEffectiveCityId(prefs, cafesQ.data);
  }, [prefs, cafesQ.data]);

  const autoSummary = useMemo(() => {
    if (!prefs || !effectiveId) return t('profile.cityModeAuto');
    const loc = locale === 'en' ? 'en' : 'ru';
    if (prefs.cityIdManual) return t('profile.cityModeAutoHint');
    return `${t('profile.cityModeAuto')} · ${cityDisplayName(effectiveId, loc)}`;
  }, [prefs, effectiveId, locale, t]);

  const setManual = (cityId: string | null) => {
    void patchAppPreferences({ cityIdManual: cityId }).then((next) => {
      setPrefs(next);
      onPatched?.();
    });
  };

  const loc = locale === 'en' ? 'en' : 'ru';

  return (
    <>
      <SettingsTile
        styles={styles}
        label={t('profile.cityModeAuto')}
        value={autoSummary}
        onPress={() => setManual(null)}
        accessibilityHint={t('profile.cityModeAuto')}
      />
      {BB_CITIES.map((c) => (
        <SettingsTile
          key={c.id}
          styles={styles}
          label={cityDisplayName(c.id, loc)}
          value={effectiveId === c.id && isKnownCityId(effectiveId) ? '✓' : ''}
          onPress={() => setManual(c.id)}
          accessibilityHint={cityDisplayName(c.id, loc)}
        />
      ))}
    </>
  );
}

export function SettingsCityScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SettingsCityPanel styles={styles} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
