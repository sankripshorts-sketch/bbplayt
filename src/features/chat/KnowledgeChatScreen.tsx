import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import knowledgeData from '../../../assets/knowledge.json';
import { searchKnowledge } from '../../knowledge/search';
import type { KnowledgeEntry } from '../../knowledge/types';
import { colors } from '../../theme';

type Msg = { id: string; role: 'user' | 'bot'; text: string };

const entries = knowledgeData as KnowledgeEntry[];

export function KnowledgeChatScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Задайте вопрос — отвечу по базе знаний клуба (без выхода в интернет).',
    },
  ]);

  const suggestions = useMemo(() => entries.slice(0, 4), []);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    const hits = searchKnowledge(trimmed, entries);
    const reply =
      hits.length > 0
        ? hits.map((h) => `${h.question}\n\n${h.answer}`).join('\n\n---\n\n')
        : 'По базе знаний ничего не найдено. Переформулируйте вопрос или обратитесь к администратору клуба.';

    const botMsg: Msg = { id: `b-${Date.now()}`, role: 'bot', text: reply };
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <Text style={styles.h1}>Помощь</Text>
      <View style={styles.chips}>
        {suggestions.map((s) => (
          <Pressable key={s.id} style={styles.chip} onPress={() => send(s.question)}>
            <Text style={styles.chipText} numberOfLines={1}>
              {s.question}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
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
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ваш вопрос…"
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
        />
        <Pressable style={styles.sendBtn} onPress={() => send(input)}>
          <Text style={styles.sendText}>→</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 12 },
  h1: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    maxWidth: '100%',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.muted, fontSize: 13 },
  list: { paddingBottom: 16 },
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
  tBot: { color: colors.text, fontSize: 15, lineHeight: 22 },
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
