import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale } from '../../i18n/LocaleContext';
import { useThemeColors } from '../../theme';
import {
  loadAppPreferences,
  patchAppPreferences,
  type ReminderMode,
  type TodaysBookingNotifMode,
} from '../../preferences/appPreferences';
import { createSettingsStyles, SettingsTile } from './settingsShared';

export function SettingsBookingRemindersPanel({ styles }: { styles: ReturnType<typeof createSettingsStyles> }) {
  const { t } = useLocale();
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
    <>
      <SettingsTile
        styles={styles}
        label={t('profile.reminderMode')}
        value={reminderMode === 'single' ? t('profile.reminderSingle') : t('profile.reminderTriple')}
        onPress={() => setMode(reminderMode === 'single' ? 'triple' : 'single')}
        accessibilityHint={t('profile.reminderMode')}
      />
      {reminderMode === 'single' ? (
        <SettingsTile
          styles={styles}
          label={t('profile.reminderMinutes')}
          value={t('profile.minutesValue', { n: reminderMinutes })}
          onPress={cycleMinutes}
          accessibilityHint={t('profile.reminderMinutes')}
        />
      ) : null}
      <SettingsTile
        styles={styles}
        label={t('profile.prepDepartHours')}
        value={prepValueText}
        onPress={cyclePrepHours}
        accessibilityHint={t('profile.prepDepartHours')}
      />

      <SettingsTile
        styles={styles}
        label={t('profile.todaysBookingModeLabel')}
        value={todaysBookingValue}
        onPress={cycleTodaysBooking}
        accessibilityHint={t('profile.todaysBookingModeLabel')}
      />
    </>
  );
}

export function SettingsBookingRemindersScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SettingsBookingRemindersPanel styles={styles} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
