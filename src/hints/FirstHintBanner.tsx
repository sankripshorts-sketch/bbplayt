import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/DinText';
import type { MessageKey } from '../i18n/messagesRu';
import { useLocale } from '../i18n/LocaleContext';
import { useThemeColors } from '../theme';
import type { ColorPalette } from '../theme/palettes';
import type { HintId } from './hintsStorage';
import { markHintSeen, shouldShowHint } from './hintsStorage';

type Props = {
  hintId: HintId;
  messageKey: MessageKey;
};

export function FirstHintBanner({ hintId, messageKey }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void shouldShowHint(hintId).then((show) => {
      if (!cancelled && show) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hintId]);

  if (!visible) return null;

  const dismiss = () => {
    void markHintSeen(hintId);
    setVisible(false);
  };

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{t(messageKey)}</Text>
      <Pressable onPress={dismiss} style={styles.btn} accessibilityRole="button">
        <Text style={styles.btnText}>{t('hints.gotIt')}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.accentDim,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    text: { color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: 8 },
    btn: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 12 },
    btnText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  });
}
