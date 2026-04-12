import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocale } from '../i18n/LocaleContext';
import { useThemeColors } from '../theme';
import type { ColorPalette } from '../theme/palettes';

type Ctx = {
  openVisitFeedbackPrompt: () => void;
};

const VisitFeedbackContext = createContext<Ctx | null>(null);

export function VisitFeedbackProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);

  const openVisitFeedbackPrompt = useCallback(() => setVisible(true), []);

  const value = useMemo(() => ({ openVisitFeedbackPrompt }), [openVisitFeedbackPrompt]);

  return (
    <VisitFeedbackContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t('feedback.visitTitle')}</Text>
            <Text style={styles.sub}>{t('feedback.visitSub')}</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.btn, styles.btnGood]}
                onPress={() => setVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.btnText}>{t('feedback.rateGood')}</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={() => setVisible(false)} accessibilityRole="button">
                <Text style={styles.btnText}>{t('feedback.rateOk')}</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={() => setVisible(false)} accessibilityRole="button">
                <Text style={styles.btnText}>{t('feedback.rateBad')}</Text>
              </Pressable>
            </View>
            <Pressable style={styles.dismiss} onPress={() => setVisible(false)}>
              <Text style={styles.dismissText}>{t('feedback.dismiss')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </VisitFeedbackContext.Provider>
  );
}

export function useVisitFeedback() {
  const v = useContext(VisitFeedbackContext);
  if (!v) throw new Error('useVisitFeedback outside VisitFeedbackProvider');
  return v;
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 24,
    },
    sheet: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    sub: { color: colors.muted, fontSize: 14, marginBottom: 16, lineHeight: 20 },
    row: { gap: 10 },
    btn: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    btnGood: { backgroundColor: colors.accentDim, borderColor: colors.accent },
    btnText: { color: colors.text, fontWeight: '600', fontSize: 15 },
    dismiss: { marginTop: 14, alignSelf: 'center', padding: 8 },
    dismissText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  });
}
