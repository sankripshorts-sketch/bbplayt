import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale } from '../../i18n/LocaleContext';
import { bestKnowledgeEntry } from '../../knowledge/search';
import { useKnowledgeEntries } from '../../knowledge/KnowledgeContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { TabSettingsButton } from '../../components/TabSettingsButton';
import { TodaysBookingBanner } from '../booking/TodaysBookingBanner';

type Msg = { id: string; role: 'user' | 'bot'; text: string };

export function KnowledgeChatScreen() {
  const { t, locale } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const entries = useKnowledgeEntries();
  const listRef = useRef<FlatList<Msg>>(null);
  const inputRef = useRef<TextInput>(null);

  const [input, setInput] = useState('');
  /** По умолчанию скрыто — больше места под переписку; раскрыть кнопкой «Показать подсказки». */
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: t('chat.welcome'),
    },
  ]);

  useEffect(() => {
    setMessages((m) =>
      m.map((x) => (x.id === 'welcome' ? { ...x, text: t('chat.welcome') } : x)),
    );
  }, [locale, t]);

  const suggestions = useMemo(() => entries.slice(0, 8), [entries]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(id);
  }, [messages.length]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    const hit = bestKnowledgeEntry(trimmed, entries);
    const reply = hit
      ? hit.answer
      : `${t('chat.noResults')}\n\n${t('chat.trySuggestions')}`;

    const botMsg: Msg = { id: `b-${Date.now()}`, role: 'bot', text: reply };
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput('');
    setPromptsOpen(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <TodaysBookingBanner />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.titleRow}>
          <Text style={styles.h1}>{t('chat.title')}</Text>
          <TabSettingsButton />
        </View>

        <FlatList
          ref={listRef}
          style={styles.listFlex}
          data={messages}
          keyExtractor={(m) => m.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
              ]}
            >
              <Text style={item.role === 'user' ? styles.tUser : styles.tBot}>{item.text}</Text>
            </View>
          )}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View style={styles.suggestionsBlock}>
          <Pressable
            style={styles.suggestionsToggle}
            onPress={() => setPromptsOpen((o) => !o)}
            accessibilityRole="button"
          >
            <Text style={styles.suggestionsToggleText}>
              {promptsOpen ? t('chat.hideQuickPrompts') : t('chat.showQuickPrompts')}
            </Text>
          </Pressable>
          {promptsOpen ? (
            <>
              <Text style={styles.suggestionsLabel}>{t('chat.quickPrompts')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsScrollInner}
                keyboardShouldPersistTaps="handled"
              >
                {suggestions.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.chip}
                    onPress={() => {
                      send(s.question);
                    }}
                  >
                    <Text style={styles.chipText} numberOfLines={2}>
                      {s.question}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            blurOnSubmit
            returnKeyType="send"
          />
          <Pressable
            style={styles.sendBtn}
            onPress={() => {
              inputRef.current?.blur();
              send(input);
            }}
          >
            <Text style={styles.sendText}>→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 12 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 12,
    },
    h1: { flex: 1, fontSize: 24, fontWeight: '700', color: colors.text },
    listFlex: { flex: 1, minHeight: 120 },
    suggestionsBlock: {
      marginTop: 4,
      paddingBottom: 4,
    },
    suggestionsToggle: {
      alignSelf: 'flex-start',
      paddingVertical: 4,
      paddingHorizontal: 2,
      marginBottom: 4,
    },
    suggestionsToggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    suggestionsLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 6,
    },
    chipsScroll: { maxHeight: 72 },
    chipsScrollInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingBottom: 2 },
    chip: {
      maxWidth: 260,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: { color: colors.muted, fontSize: 13 },
    list: { paddingBottom: 8, flexGrow: 1 },
    bubble: {
      maxWidth: '92%',
      padding: 12,
      borderRadius: 14,
      marginBottom: 10,
    },
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: colors.accent,
    },
    bubbleBot: {
      alignSelf: 'flex-start',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tUser: { color: '#fff', fontSize: 15, lineHeight: 20 },
    tBot: { color: colors.text, fontSize: 15, lineHeight: 24 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    sendBtn: {
      backgroundColor: colors.accent,
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  });
}
