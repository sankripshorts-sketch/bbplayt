import Constants from 'expo-constants';

/** Публичный URL JSON базы знаний (опционально). Пустая строка = только бандл. */
export function getKnowledgeJsonUrl(): string | undefined {
  const fromExtra = Constants.expoConfig?.extra?.knowledgeJsonUrl as string | undefined;
  const t = fromExtra?.trim();
  if (t) return t;
  const env =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_KNOWLEDGE_JSON_URL?.trim() : '';
  return env || undefined;
}
