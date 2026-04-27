import React from 'react';
import { Pressable, View, type TextStyle, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import { useThemeColors } from '../../theme';

export type ProfileInsightActionRowStyles = {
  actionCard: ViewStyle;
  actionCardPressed: ViewStyle;
  actionCardText: ViewStyle;
  actionCardTitle: TextStyle;
};

type RowBase = {
  styles: ProfileInsightActionRowStyles;
  onPress: () => void;
  disabled?: boolean;
};

/** Карточка раздела инсайтов: только заголовок и переход — без фиктивной «статистики» с превью. */
export function ProfileInsightBalanceHistoryRow({ styles, onPress }: RowBase) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name="cash-multiple" size={22} color={colors.accentBright} />
      <View style={styles.actionCardText}>
        <Text style={styles.actionCardTitle} numberOfLines={2}>
          {t('profile.ctaBalanceHistory')}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

export function ProfileInsightGameSessionsRow({ styles, onPress }: RowBase) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name="controller-classic-outline"
        size={22}
        color={colors.accentBright}
      />
      <View style={styles.actionCardText}>
        <Text style={styles.actionCardTitle} numberOfLines={2}>
          {t('profile.ctaGameSessions')}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

export function ProfileInsightCustomerAnalysisRow({ styles, onPress, disabled }: RowBase) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
      onPress={onPress}
      disabled={disabled}
    >
      <MaterialCommunityIcons name="chart-line" size={22} color={colors.accentBright} />
      <View style={styles.actionCardText}>
        <Text style={styles.actionCardTitle} numberOfLines={2}>
          {t('profile.ctaCustomerAnalysis')}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

export function ProfileInsightRankingRow({ styles, onPress }: RowBase) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name="trophy-outline" size={22} color={colors.accentBright} />
      <View style={styles.actionCardText}>
        <Text style={styles.actionCardTitle} numberOfLines={2}>
          {t('profile.ctaRanking')}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}
