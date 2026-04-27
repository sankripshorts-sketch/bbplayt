import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/DinText';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { useThemeColors } from '../../theme';
import type { ProfileStackParamList } from '../../navigation/types';
import { createSettingsStyles, SettingsTile } from './settingsShared';
import {
  clearFaceEnrollment,
  faceProfileKey,
  loadFaceEnrollment,
  type FaceEnrollment,
} from './faceEnrollmentStorage';

export function faceEnrollmentSummary(t: ReturnType<typeof useLocale>['t'], enrollment: FaceEnrollment | null): string {
  if (!enrollment) return t('profile.faceSummaryEmpty');
  return t('profile.faceSummaryReady');
}

export function SettingsFacePanel({
  styles,
  onChanged,
}: {
  styles: ReturnType<typeof createSettingsStyles>;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { t } = useLocale();
  const colors = useThemeColors();
  const introStyle = useMemo(
    () => ({
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 14,
    }),
    [colors.muted],
  );
  const profileKey = faceProfileKey(user?.memberId);
  const [enrollment, setEnrollment] = useState<FaceEnrollment | null>(null);

  const reload = useCallback(() => {
    void loadFaceEnrollment(profileKey).then(setEnrollment);
  }, [profileKey]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const clear = useCallback(() => {
    void clearFaceEnrollment(profileKey).then(() => {
      setEnrollment(null);
      onChanged?.();
    });
  }, [onChanged, profileKey]);

  const openCapture = useCallback(() => {
    navigation.navigate('FaceCapture');
  }, [navigation]);

  return (
    <View>
      <Text style={introStyle}>{t('profile.faceIntro')}</Text>
      <SettingsTile
        styles={styles}
        label={enrollment ? t('profile.faceRetakeButton') : t('profile.faceAddButton')}
        value={faceEnrollmentSummary(t, enrollment)}
        onPress={openCapture}
        accessibilityHint={t('profile.faceAddButton')}
      />
      {enrollment ? (
        <SettingsTile
          styles={styles}
          label={t('profile.faceDeleteButton')}
          value=""
          onPress={clear}
          destructive
          accessibilityHint={t('profile.faceDeleteButton')}
        />
      ) : null}
    </View>
  );
}

export function SettingsFaceScreen() {
  const colors = useThemeColors();
  const settingsStyles = useMemo(() => createSettingsStyles(colors), [colors]);

  return (
    <KeyboardAvoidingView
      style={settingsStyles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={settingsStyles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={settingsStyles.scroll} keyboardShouldPersistTaps="handled">
          <SettingsFacePanel styles={settingsStyles} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
