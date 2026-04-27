import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useTheme } from '../theme/ThemeContext';

/**
 * Цвет статус-бара и корня окна под палитру приложения.
 * Внутрь системной шторки уведомлений UI положить нельзя — только такие нативные настройки.
 */
export function ThemedSystemChrome() {
  const { theme, colors } = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  return (
    <StatusBar
      style={theme === 'light' ? 'dark' : 'light'}
      {...(Platform.OS === 'android'
        ? { backgroundColor: colors.bg, translucent: false }
        : {})}
    />
  );
}
