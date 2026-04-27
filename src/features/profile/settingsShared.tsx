import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/DinText';
import { useThemeColors } from '../../theme';
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

export function SettingsExpandableSection({
  label,
  summary,
  expanded,
  onToggle,
  styles,
  children,
  accessibilityLabel,
  accessibilityHint,
}: {
  label: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof createSettingsStyles>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const themeColors = useThemeColors();
  return (
    <View style={styles.accordion}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (summary.trim() ? `${label}. ${summary}` : label)}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ expanded }}
        android_ripple={
          Platform.OS === 'android' ? { color: 'rgba(128,128,128,0.25)', borderless: false } : undefined
        }
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.tilePressed]}
      >
        <View style={styles.accordionHeaderText}>
          <Text style={styles.tileLabel}>{label}</Text>
          {summary.trim() ? (
            <Text style={styles.accordionSummary} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={themeColors.muted}
        />
      </Pressable>
      {expanded ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

/**
 * Строка настроек с заголовком и сводкой — нажатие ведёт на другой экран (как «Город → список»).
 */
export function SettingsNavigationCard({
  label,
  summary,
  onPress,
  styles,
  accessibilityHint,
}: {
  label: string;
  summary: string;
  onPress: () => void;
  styles: ReturnType<typeof createSettingsStyles>;
  accessibilityHint?: string;
}) {
  const themeColors = useThemeColors();
  return (
    <View style={styles.accordion}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={summary.trim() ? `${label}. ${summary}` : label}
        accessibilityHint={accessibilityHint}
        android_ripple={
          Platform.OS === 'android' ? { color: 'rgba(128,128,128,0.25)', borderless: false } : undefined
        }
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.tilePressed]}
      >
        <View style={styles.accordionHeaderText}>
          <Text style={styles.tileLabel}>{label}</Text>
          {summary.trim() ? (
            <Text style={styles.accordionSummary} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={themeColors.muted} />
      </Pressable>
    </View>
  );
}

export function SettingsSubRow({
  label,
  onPress,
  styles,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createSettingsStyles>;
  accessibilityHint?: string;
}) {
  const themeColors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      android_ripple={
        Platform.OS === 'android' ? { color: 'rgba(128,128,128,0.2)', borderless: false } : undefined
      }
      style={({ pressed }) => [styles.subRow, pressed && styles.tilePressed]}
    >
      <Text style={styles.subRowLabel} numberOfLines={2}>
        {label}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.muted} />
    </Pressable>
  );
}

export function createSettingsStyles(colors: ColorPalette) {
  return StyleSheet.create({
    flex: { flex: 1 },
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 20, paddingBottom: 40 },
    accordion: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      /** На web `overflow: hidden` у родителя часто срезает низ длинной формы (некорректный замер высоты). */
      overflow: Platform.OS === 'web' ? 'visible' : 'hidden',
    },
    accordionHeader: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    accordionHeaderText: { flex: 1, minWidth: 0 },
    accordionSummary: {
      color: colors.accentBright,
      fontWeight: '600',
      fontSize: 13,
      marginTop: 4,
    },
    accordionBody: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 20,
    },
    subRow: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      paddingLeft: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    subRowLabel: { color: colors.text, fontSize: 15, fontWeight: '500', flex: 1, paddingRight: 8 },
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
    settingsFacePhotoWrap: {
      alignItems: 'center',
      marginBottom: 18,
    },
    settingsFacePhoto: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
  });
}
