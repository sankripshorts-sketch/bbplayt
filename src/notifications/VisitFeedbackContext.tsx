import { useQuery } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../components/DinText';
import { TextInput } from '../components/DinTextInput';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { cafesApi } from '../api/endpoints';
import { useLocale } from '../i18n/LocaleContext';
import { useThemeColors } from '../theme';
import type { ColorPalette } from '../theme/palettes';
import { queryKeys } from '../query/queryKeys';
import { useMemberBooksQuery } from '../features/booking/useMemberBooksQuery';
import { useBookingNowMs } from '../features/booking/useBookingNowMs';
import { addHandledVisitKey, loadHandledVisitKeys } from './visitFeedbackStorage';
import { selectPendingVisitFeedback, type PendingVisitFeedback } from './selectPendingVisitFeedback';
import { formatPublicClubLabel, formatPublicPcLabel } from '../utils/publicText';

type Ctx = {
  openVisitFeedbackPrompt: () => void;
};

const VisitFeedbackContext = createContext<Ctx | null>(null);

export function VisitFeedbackProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const booksQ = useMemberBooksQuery(user?.memberAccount);
  const nowMs = useBookingNowMs(60_000);
  const cafesQ = useQuery({
    queryKey: queryKeys.cafes(),
    queryFn: () => cafesApi.list(),
    staleTime: 10 * 60 * 1000,
  });
  const addressById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cafesQ.data ?? []) m.set(c.icafe_id, c.address);
    return m;
  }, [cafesQ.data]);

  const [handledKeys, setHandledKeys] = useState<Set<string> | null>(null);
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [thanks, setThanks] = useState(false);
  const [display, setDisplay] = useState<PendingVisitFeedback | null>(null);

  useEffect(() => {
    let alive = true;
    void loadHandledVisitKeys().then((s) => {
      if (alive) setHandledKeys(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const pending = useMemo(() => {
    if (!handledKeys) return null;
    return selectPendingVisitFeedback(booksQ.data, nowMs, handledKeys, addressById);
  }, [booksQ.data, nowMs, handledKeys, addressById]);

  const resetForm = useCallback(() => {
    setRating(0);
    setComment('');
    setThanks(false);
  }, []);

  const openVisitFeedbackPrompt = useCallback(() => {
    if (!handledKeys) return;
    const p = selectPendingVisitFeedback(booksQ.data, nowMs, handledKeys, addressById);
    if (!p) return;
    setDisplay(p);
    resetForm();
    setVisible(true);
  }, [booksQ.data, nowMs, handledKeys, addressById, resetForm]);

  const markHandled = useCallback(async (key: string) => {
    await addHandledVisitKey(key);
    setHandledKeys((prev) => {
      const next = new Set(prev ?? []);
      next.add(key);
      return next;
    });
  }, []);

  const closeModal = useCallback(async () => {
    if (display?.bookingKey && !thanks) {
      await markHandled(display.bookingKey);
    }
    setVisible(false);
    setDisplay(null);
    resetForm();
  }, [display, thanks, markHandled, resetForm]);

  const submit = useCallback(async () => {
    if (!display || rating < 1) return;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[visit-feedback]', {
        key: display.bookingKey,
        rating,
        comment: comment.trim(),
        club: formatPublicClubLabel({ address: display.clubAddress, t }),
        pc: formatPublicPcLabel(display.pcName, t),
      });
    }
    await markHandled(display.bookingKey);
    setThanks(true);
    setTimeout(() => {
      setVisible(false);
      setDisplay(null);
      setThanks(false);
      resetForm();
    }, 1400);
  }, [display, rating, comment, markHandled, resetForm]);

  const value = useMemo(() => ({ openVisitFeedbackPrompt }), [openVisitFeedbackPrompt]);

  const autoPromptedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const tryOpen = () => {
      if (!handledKeys) return;
      if (!pending) return;
      if (autoPromptedRef.current.has(pending.bookingKey)) return;
      autoPromptedRef.current.add(pending.bookingKey);
      openVisitFeedbackPrompt();
    };
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tryOpen();
    });
    const t = setTimeout(() => {
      if (AppState.currentState === 'active') tryOpen();
    }, 900);
    return () => {
      sub.remove();
      clearTimeout(t);
    };
  }, [handledKeys, pending, openVisitFeedbackPrompt]);

  return (
    <VisitFeedbackContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void closeModal()}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => void closeModal()} />
          <View style={styles.sheet}>
            {thanks ? (
              <Text style={styles.title}>{t('feedback.thanks')}</Text>
            ) : (
              <>
                <Text style={styles.title}>{t('feedback.visitTitle')}</Text>
                {display ? (
                  <Text style={styles.sub}>
                    {formatPublicClubLabel({ address: display.clubAddress, t })} · {formatPublicPcLabel(display.pcName, t)}
                  </Text>
                ) : (
                  <Text style={styles.sub}>{t('feedback.visitSub')}</Text>
                )}
                <Text style={styles.starsLabel}>{t('feedback.starsLabel')}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setRating(n)}
                      accessibilityRole="button"
                      accessibilityLabel={`${n}`}
                      hitSlop={6}
                    >
                      <MaterialCommunityIcons
                        name={n <= rating ? 'star' : 'star-outline'}
                        size={36}
                        color={n <= rating ? colors.accentBright : colors.muted}
                      />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('feedback.commentPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  maxLength={800}
                />
                <Pressable
                  style={[styles.submitBtn, rating < 1 && styles.submitBtnDisabled]}
                  onPress={() => void submit()}
                  disabled={rating < 1}
                  accessibilityRole="button"
                >
                  <Text style={styles.submitBtnText}>{t('feedback.submit')}</Text>
                </Pressable>
                <Pressable style={styles.dismiss} onPress={() => void closeModal()}>
                  <Text style={styles.dismissText}>{t('feedback.dismiss')}</Text>
                </Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
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
      maxHeight: '88%',
    },
    title: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    sub: { color: colors.muted, fontSize: 14, marginBottom: 12, lineHeight: 20 },
    starsLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    starsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    input: {
      minHeight: 72,
      maxHeight: 140,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      color: colors.text,
      backgroundColor: colors.bg,
      textAlignVertical: 'top',
      marginBottom: 14,
    },
    submitBtn: {
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accentSecondary,
      alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: { color: colors.text, fontWeight: '700', fontSize: 16 },
    dismiss: { marginTop: 14, alignSelf: 'center', padding: 8 },
    dismissText: { color: colors.accentBright, fontWeight: '600', fontSize: 15 },
  });
}
