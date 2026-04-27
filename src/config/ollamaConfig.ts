import Constants from 'expo-constants';

export type OllamaConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

/** База Cloud API: https://ollama.com/api (POST /chat). */
export function getOllamaConfig(): OllamaConfig {
  const extra = Constants.expoConfig?.extra as
    | { ollamaBaseUrl?: string; ollamaModel?: string; ollamaApiKey?: string }
    | undefined;
  const fromEnv = process.env.EXPO_PUBLIC_OLLAMA_BASE_URL;
  const baseUrl = (fromEnv || extra?.ollamaBaseUrl || 'https://ollama.com/api').replace(/\/$/, '');
  const model = process.env.EXPO_PUBLIC_OLLAMA_MODEL || extra?.ollamaModel || 'gpt-oss:120b';
  const apiKey = (process.env.EXPO_PUBLIC_OLLAMA_API_KEY || extra?.ollamaApiKey || '').trim();
  return { baseUrl, model, apiKey };
}
