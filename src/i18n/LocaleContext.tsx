import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messagesEn } from './messagesEn';
import { messagesRu, type MessageKey } from './messagesRu';

const STORAGE_KEY = 'bbplay.locale';

export type AppLocale = 'ru' | 'en';

function localeFromSystem(): AppLocale {
  try {
    const tag = (Intl.DateTimeFormat().resolvedOptions().locale ?? '').toLowerCase();
    return tag.startsWith('en') ? 'en' : 'ru';
  } catch {
    return 'ru';
  }
}

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (l: AppLocale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{{${k}}}`).join(String(v));
  }
  return s;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('ru');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw === 'en' || raw === 'ru') setLocaleState(raw);
      else setLocaleState(localeFromSystem());
    });
  }, []);

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const table = useMemo(() => (locale === 'en' ? messagesEn : messagesRu), [locale]);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      const template = table[key];
      if (template === undefined || template === null) {
        return String(key);
      }
      return interpolate(template, vars);
    },
    [table],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

export function useLocaleCode(): AppLocale {
  return useLocale().locale;
}
