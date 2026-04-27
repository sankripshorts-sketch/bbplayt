import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './DinText';
import { DimmedSheetModal } from './DimmedSheetModal';
import { useLocale } from '../i18n/LocaleContext';
import { useThemeColors } from '../theme';
import type { ColorPalette } from '../theme/palettes';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = {
  cancelable?: boolean;
};

type AlertPayload = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
};

type AlertContextValue = {
  showAlert: (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  const { t } = useLocale();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [queue, setQueue] = useState<AlertPayload[]>([]);

  const active = queue[0] ?? null;
  const resolvedButtons = active?.buttons?.length
    ? active.buttons
    : [{ text: t('verify.alertOk'), style: 'default' as const }];

  const closeActive = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
      setQueue((prev) => [...prev, { title, message, buttons, options }]);
    },
    [],
  );

  const onPressBackdrop = useCallback(() => {
    if (!active?.options?.cancelable) return;
    closeActive();
  }, [active?.options?.cancelable, closeActive]);

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <DimmedSheetModal
        visible={active != null}
        onRequestClose={onPressBackdrop}
        contentAlign="stretch"
        dimOpacity={0.96}
      >
        {() => (
          <View style={styles.host}>
            <View style={styles.card}>
              <Text style={styles.title}>{active?.title ?? ''}</Text>
              {active?.message ? <Text style={styles.message}>{active.message}</Text> : null}
              <View style={styles.buttonCol}>
                {resolvedButtons?.map((btn, idx) => {
                  const role = btn.style ?? 'default';
                  const isPrimary = role === 'default';
                  const onPress = () => {
                    closeActive();
                    btn.onPress?.();
                  };
                  return (
                    <Pressable
                      key={`${btn.text ?? 'alert-button'}-${idx}`}
                      style={({ pressed }) => [
                        isPrimary ? styles.primaryBtn : styles.ghostBtn,
                        pressed && styles.btnPressed,
                      ]}
                      onPress={onPress}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          isPrimary ? styles.primaryBtnText : styles.ghostBtnText,
                          role === 'destructive' && styles.destructiveText,
                        ]}
                      >
                        {btn.text ?? t('verify.alertOk')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </DimmedSheetModal>
    </AlertContext.Provider>
  );
}

export function useAppAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAppAlert must be used within AppAlertProvider');
  return ctx;
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    host: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 18,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.cardElevated,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      gap: 10,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
        },
        android: { elevation: 12 },
        web: { boxShadow: '0 10px 18px rgba(0,0,0,0.35)' },
        default: {},
      }),
    },
    title: {
      color: colors.text,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
    },
    message: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 21,
    },
    buttonCol: {
      gap: 8,
      marginTop: 2,
    },
    primaryBtn: {
      minHeight: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
    },
    ghostBtn: {
      minHeight: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
    },
    primaryBtnText: {
      color: colors.accentTextOnButton,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '800',
    },
    ghostBtnText: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
    },
    destructiveText: {
      color: colors.danger,
    },
    btnPressed: {
      opacity: 0.86,
    },
  });
}
