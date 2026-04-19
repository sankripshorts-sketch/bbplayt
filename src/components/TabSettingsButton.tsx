import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocale } from '../i18n/LocaleContext';
import type { MainTabParamList } from '../navigation/types';
import { useThemeColors } from '../theme';

/**
 * Кнопка «Настройки» в углу экрана (как на главной вкладке профиля) — открывает стек профиля на Settings.
 */
export function TabSettingsButton() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const onPress = useCallback(() => {
    navigation.navigate('Profile', { screen: 'Settings' });
  }, [navigation]);

  return (
    <Pressable
      style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('profile.settings')}
    >
      <MaterialCommunityIcons name="cog-outline" size={26} color={colors.text} />
    </Pressable>
  );
}

function createStyles(colors: { border: string; card: string }) {
  return StyleSheet.create({
    iconBtn: {
      minWidth: 48,
      minHeight: 48,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconBtnPressed: { opacity: 0.85 },
  });
}
