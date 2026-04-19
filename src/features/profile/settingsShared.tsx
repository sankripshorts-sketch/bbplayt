import React from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { Text } from '../../components/DinText';
import type { ColorPalette } from '../../theme/palettes';

export function SettingsTile({
  label,
  value,
  onPress,
  styles,
  accessibilityHint,
  destructive,
}: {
  label: string;
  value: string;
  onPress: () => void;
  styles: ReturnType<typeof createSettingsStyles>;
  accessibilityHint?: string;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value.trim() ? `${label}: ${value}` : label}
      accessibilityHint={accessibilityHint}
      android_ripple={
        Platform.OS === 'android' ? { color: 'rgba(128,128,128,0.25)', borderless: false } : undefined
      }
      style={({ pressed }) => [
        styles.tile,
        destructive && styles.tileDanger,
        pressed && styles.tilePressed,
      ]}
    >
      <Text style={[styles.tileLabel, destructive && styles.tileLabelDanger]}>{label}</Text>
      {value.trim() ? (
        <Text style={[styles.tileValue, destructive && styles.tileValueDanger]} numberOfLines={3}>
          {value}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function createSettingsStyles(colors: ColorPalette) {
  return StyleSheet.create({
    flex: { flex: 1 },
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 20, paddingBottom: 40 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.accentBright,
      marginBottom: 10,
      marginTop: 4,
    },
    tile: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
    },
    tileDanger: {
      borderColor: colors.danger,
      backgroundColor: colors.card,
    },
    tilePressed: { opacity: 0.9 },
    tileLabel: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      flex: 1,
    },
    tileLabelDanger: { color: colors.danger },
    tileValue: {
      color: colors.accentBright,
      fontWeight: '600',
      fontSize: 14,
      textAlign: 'right',
      maxWidth: '52%',
    },
    tileValueDanger: { color: colors.danger },
    logoutBlock: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
  });
}
