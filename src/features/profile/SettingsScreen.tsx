import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { EditProfileSection } from './EditProfileScreen';
import type { ColorPalette } from '../../theme/palettes';
import { useTheme, useThemeColors } from '../../theme';
import {
  loadAppPreferences,
  patchAppPreferences,
  type ReminderMode,
  type TodaysBookingNotifMode,
} from '../../preferences/appPreferences';

export function SettingsScreen() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reminderMode, setReminderMode] = useState<ReminderMode>('single');
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [prepHours, setPrepHours] = useState(2);
  const [todaysBookingMode, setTodaysBookingMode] = useState<TodaysBookingNotifMode>('until_ack');

  useEffect(() => {
    void loadAppPreferences().then((p) => {
      setReminderMode(p.reminderMode);
      setReminderMinutes(p.reminderMinutesBefore);
      setPrepHours(p.prepDepartHoursBefore);
      setTodaysBookingMode(p.todaysBookingNotifMode);
    });
  }, []);

  const toggleLocale = () => setLocale(locale === 'ru' ? 'en' : 'ru');
  const cycleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const setMode = (mode: ReminderMode) => {
    setReminderMode(mode);
    void patchAppPreferences({ reminderMode: mode });
  };

  const cycleMinutes = () => {
    const opts = [15, 30, 45, 60, 90];
    const i = opts.indexOf(reminderMinutes);
    const idx = i === -1 ? 0 : i;
    const next = opts[(idx + 1) % opts.length];
    setReminderMinutes(next);
    void patchAppPreferences({ reminderMinutesBefore: next });
  };

  const cyclePrepHours = () => {
    const opts = [0, 1, 2, 3, 4, 6];
    const i = opts.indexOf(prepHours);
    const idx = i === -1 ? 0 : i;
    const next = opts[(idx + 1) % opts.length];
    setPrepHours(next);
    void patchAppPreferences({ prepDepartHoursBefore: next });
  };

  const prepValueText =
    prepHours === 0 ? t('profile.prepDepartOff') : t('profile.hoursValue', { n: prepHours });

  const cycleTodaysBooking = () => {
    const next: TodaysBookingNotifMode = todaysBookingMode === 'until_ack' ? 'once' : 'until_ack';
    setTodaysBookingMode(next);
    void patchAppPreferences({ todaysBookingNotifMode: next });
  };

  const todaysBookingValue =
    todaysBookingMode === 'until_ack'
      ? t('profile.todaysBookingUntilAck')
      : t('profile.todaysBookingOnce');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {user?.memberId ? (
            <>
              <Text style={styles.sectionTitle}>{t('profile.sectionProfile')}</Text>
              <EditProfileSection />
            </>
          ) : null}

          <Text style={styles.sectionTitle}>{t('profile.sectionAppearance')}</Text>
        <View style={styles.card}>
          <SettingsRow
            styles={styles}
            showDivider
            label={t('profile.theme')}
            value={theme === 'dark' ? t('profile.themeDark') : t('profile.themeLight')}
            onPress={cycleTheme}
            accessibilityHint={t('profile.theme')}
          />
          <SettingsRow
            styles={styles}
            label={t('profile.language')}
            value={locale === 'ru' ? t('profile.langRu') : t('profile.langEn')}
            onPress={toggleLocale}
            accessibilityHint={t('profile.language')}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('profile.reminderTitle')}</Text>
        <View style={styles.card}>
          <SettingsRow
            styles={styles}
            showDivider
            label={t('profile.reminderMode')}
            value={reminderMode === 'single' ? t('profile.reminderSingle') : t('profile.reminderTriple')}
            onPress={() => setMode(reminderMode === 'single' ? 'triple' : 'single')}
            accessibilityHint={t('profile.reminderMode')}
          />
          {reminderMode === 'single' ? (
            <SettingsRow
              styles={styles}
              showDivider
              label={t('profile.reminderMinutes')}
              value={t('profile.minutesValue', { n: reminderMinutes })}
              onPress={cycleMinutes}
              accessibilityHint={t('profile.reminderMinutes')}
            />
          ) : null}
          <SettingsRow
            styles={styles}
            label={t('profile.prepDepartHours')}
            value={prepValueText}
            onPress={cyclePrepHours}
            accessibilityHint={t('profile.prepDepartHours')}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('profile.todaysBookingSection')}</Text>
        <View style={styles.card}>
          <SettingsRow
            styles={styles}
            label={t('profile.todaysBookingModeLabel')}
            value={todaysBookingValue}
            onPress={cycleTodaysBooking}
            accessibilityHint={t('profile.todaysBookingModeLabel')}
          />
        </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  showDivider,
  styles,
  accessibilityHint,
}: {
  label: string;
  value: string;
  onPress: () => void;
  showDivider?: boolean;
  styles: ReturnType<typeof createStyles>;
  accessibilityHint?: string;
}) {
  return (
    <View style={[styles.settingsRowWrap, showDivider ? styles.settingsRowDivider : null]}>
      <Text style={styles.settingsLabel}>{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityHint={accessibilityHint}
        android_ripple={
          Platform.OS === 'android' ? { color: 'rgba(128,128,128,0.25)', borderless: false } : undefined
        }
        style={({ pressed }) => [styles.segmentBtn, pressed && styles.segmentBtnPressed]}
      >
        <Text style={styles.segmentText} numberOfLines={2}>
          {value}
        </Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    flex: { flex: 1 },
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 20, paddingBottom: 40 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.muted,
      marginBottom: 10,
      marginTop: 4,
    },
    settingsRowWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 12,
    },
    settingsRowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    settingsLabel: {
      color: colors.text,
      fontSize: 15,
      flex: 1,
      paddingRight: 8,
    },
    segmentBtn: {
      maxWidth: '58%',
      backgroundColor: colors.cardElevated,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segmentBtnPressed: { opacity: 0.88 },
    segmentText: { color: colors.accent, fontWeight: '600', fontSize: 14, textAlign: 'right' },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
  });
}
