import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Animated,
  FlatList,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import type { TextInput as RnTextInput } from 'react-native';
import { Text } from '../../components/DinText';
import { TextInput } from '../../components/DinTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale } from '../../i18n/LocaleContext';
import { useNavigation } from '@react-navigation/native';
import { useIsOnline } from '../../hooks/useIsOnline';
import { bestKnowledgeEntry } from '../../knowledge/search';
import { useKnowledgeEntries } from '../../knowledge/KnowledgeContext';
import { getOllamaConfig } from '../../config/ollamaConfig';
import { completeWithOllamaRag, OllamaRagError } from '../../ai/ollamaRagChat';
import { extractBookingWithOllama, type BookingLlmExtraction } from '../../ai/ollamaBookingExtract';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { TabScreenTopBar } from '../../components/TabScreenTopBar';
import { TodaysBookingBanner } from '../booking/TodaysBookingBanner';
import { useBookingNowMs } from '../booking/useBookingNowMs';
import { useAuth } from '../../auth/AuthContext';
import { useMemberBooksQuery } from '../booking/useMemberBooksQuery';
import { useCancelBookingMutation } from '../booking/useCancelBookingMutation';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { bookingFlowApi, cafesApi } from '../../api/endpoints';
import { fetchCafeBookingProducts, mergeBookingProductsCatalog } from '../../api/cafeBookingProducts';
import { queryKeys } from '../../query/queryKeys';
import type { CafeItem, MemberBookingRow, PcListItem, ProductItem } from '../../api/types';
import { bookingRowLifecycleStatus, memberOfferIdForApi } from '../booking/memberBookingsUtils';
import { combineServerISODateAndTime, intervalFromMemberRow } from '../booking/bookingTimeUtils';
import {
  addCalendarDaysMoscow,
  formatInstantInMoscow,
  formatISODateMoscow,
  formatMoscowCalendarDayLong,
  formatMoscowWallSlotForLocale,
  moscowWallTimeToUtc,
} from '../../datetime/mskTime';
import { nowForBookingCompareMs } from '../../datetime/serverBookingClock';
import { formatPublicErrorMessage, formatPublicPcToken } from '../../utils/publicText';
import { ApiError } from '../../api/client';
import type { MessageKey } from '../../i18n/messagesRu';
import { loadAppPreferences } from '../../preferences/appPreferences';
import { findNearestAcrossClubs } from '../booking/findAcrossClubs';
import { pcNamesLooselyEqual } from '../booking/pcNameMatch';
import { pcZoneKindFromPc, type PcZoneKind } from '../booking/pcZoneKind';
import { DraggableWheelSheet } from '../booking/DraggableWheelSheet';
import { WheelPickerColumn, type WheelPickerColumnHandle, type WheelPickerItem } from '../booking/WheelPickerColumn';
import { buildBookingTimeSlots } from '../booking/bookingTimeSlots';
import { BB_CITIES, DEFAULT_CITY_ID, cafesInCity, orderedCitiesForPicker } from '../../config/citiesCatalog';
import {
  bookingPackageWheelDisplayMins,
  dedupeBookingWheelPackagesByDuration,
  filterBookingWheelPackageProducts,
  HOURLY_GRID_DURATION_MINUTES,
} from '../booking/tariffSelection';
import { formatBookingDurationHuman } from '../booking/durationHuman';
import { packageSavingPercentForWheel } from '../booking/zoneTariffResolve';
import { ClubLayoutCanvas } from '../cafes/ClubLayoutCanvas';
import { HallMapStatusLegend } from '../cafes/HallMapStatusLegend';
import {
  getPrecedingUserText,
  upsertPendingKnowledgeChatFeedback,
} from './knowledgeChatFeedbackStorage';
import type { KnowledgeCategory } from '../../knowledge/types';

type ChatCta = {
  label: string;
  prefill: {
    icafeId: number;
    pcName?: string;
    mins?: number;
    dateISO?: string;
    timeHHmm?: string;
    openNearestSearch?: boolean;
    pcPickerMode?: 'scheme' | 'list';
  };
};
type ChatNavTarget =
  | 'profileTopUp'
  | 'profileHome'
  | 'balanceHistory'
  | 'settings'
  | 'food'
  | 'cafes'
  | 'news'
  | 'profileDice';

type ChatAction = {
  label: string;
  sendText?: string;
  prefill?: ChatCta['prefill'];
  openBooking?: boolean;
  openFilter?: 'club' | 'date' | 'timeMins' | 'pc' | 'editParam';
  /** Переход во вкладку / вложенный экран (не путать с openBooking — это таб «Бронь») */
  navigate?: ChatNavTarget;
};
type AdminChatLine = { id: string; role: 'user' | 'system'; text: string };
type Msg = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  cta?: ChatCta;
  actions?: ChatAction[];
  actionsTitle?: string;
  /** Лайк/дизлайк по ответу бота (локально + в очереди на синхронизацию) */
  feedback?: 'up' | 'down';
  /** Благодарность показываем с задержкой, чтобы сначала был виден выбранный лайк/дизлайк. */
  feedbackThanksVisible?: boolean;
  /** После «Спасибо за оценку» убрать строку с кнопками/текстом через 5 с */
  feedbackThanksHidden?: boolean;
};
type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

type BookingDraft = {
  icafeId: number | null;
  pcName: string | null;
  mins: number | null;
  dateISO: string | null;
  hhmm: string | null;
  durationNeedsConfirm?: boolean;
};

/**
 * Session-only chat draft cache:
 * survives screen unmount/remount within a running app process,
 * and resets naturally after full app restart.
 */
/** Сессия: отдельные черновики ввода для чата БЗ и нейро-чата. */
let knowledgeChatInputDraft: { k: string; n: string } = { k: '', n: '' };

function emotionalSupportFallback(query: string, locale: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const isRu = locale.startsWith('ru');

  if (/грустно|печаль|тоск|плохо\s+на\s+душе|одиноко|депресс|уныни|мне\s+плохо/u.test(q)) {
    return isRu
      ? 'Слышу тебя 🫂 Очень жаль, что сейчас тяжело. Если хочешь, можем просто немного поболтать — я рядом. А когда будешь готов(а), помогу с любым вопросом по клубу ✨'
      : 'I hear you 🫂 I am sorry this feels heavy right now. We can chat for a bit, and when you are ready I will help with any club question ✨';
  }

  if (/тревог|паник|страшно|нервнич|стресс|пережива/u.test(q)) {
    return isRu
      ? 'Я рядом 🤝 Давай без спешки: медленный вдох и выдох пару раз. Потом напиши, что именно нужно, и разберем по шагам 🌿'
      : 'I am here 🤝 Let us go slowly: take a couple of calm breaths. Then tell me what you need, and we will do it step by step 🌿';
  }

  if (/устал|выжат|нет\s+сил|задолбал|задолбало|выгорел|выгорела/u.test(q)) {
    return isRu
      ? 'Понимаю тебя 💛 Давай максимально просто: напиши цель одной фразой (например, "найди ближайший клуб"), и я дам короткий готовый ответ ⚡'
      : 'I get you 💛 Keep it simple: send your goal in one line (for example, "find nearest club"), and I will give a short ready answer ⚡';
  }

  return null;
}

function pickVariant<T>(variants: readonly T[]): T {
  return variants[Math.floor(Math.random() * variants.length)]!;
}

/** Локальные шаблоны для режима «База знаний»: несколько формулировок, чтобы не копипаст. */
function casualSmalltalkFallback(query: string, locale: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const isRu = locale.startsWith('ru');

  if (/^(привет|здаров|здравствуйте|hi|hello|hey)\b/u.test(q)) {
    if (isRu) {
      return pickVariant([
        'Привет! Я помощник BlackBears Play 👋 Могу подсказать по брони, тарифам, графику, адресам и вопросам по ПК. С чего начнём?',
        'Здравствуй! Поддержка BlackBears Play на связи. Помогу с бронью, ценами, клубами и ПК — что ищешь?',
        'Привет! ✨ BlackBears Play, на связи. Кратко: бронь, тарифы, контакты, свободные места, базово про зал. Какой вопрос задать первым?',
        'Хай! BlackBears Play на связи. Напиши, нужна бронь, цены, график или что-то по компам — отвечу по делу. Удобно в двух словах?',
        'Привет-привет 👋 Я из поддержки сети BlackBears Play. Могу провести по справке: от записи на ПК до контактов клуба. Чем помочь?',
      ]);
    }
    return pickVariant([
      "Hey! 👋 I'm the BlackBears Play assistant. I can help with booking, rates, hours, club info, and PC basics. What do you need first?",
      'Hi! BlackBears Play support here — booking, tariffs, locations, a quick word on hardware. How can I help?',
      'Hello! ✨ BlackBears Play support is here. Ask about booking, prices, or PCs in one line.',
    ]);
  }
  if (/(как\s*дела|как\s*ты|how are you)/u.test(q)) {
    if (isRu) {
      return pickVariant([
        'Нормально, на связи ✨ BlackBears Play: бронь, тарифы, клубы, ПК. Чем помочь сейчас?',
        'Всё ок 🤙 Поддержка BlackBears Play на связи. Что по делу: бронь, цена слота, график?',
        'Работаю в штатном режиме. Напомню: я из поддержки сети BlackBears Play — могу подсказать по брони, контактам, залу. Вопрос?',
        'Хорошо! Я BlackBears Play, помогу с бронью, ценой или схемой — что проверим?',
      ]);
    }
    return pickVariant([
      'Doing great, I am here ✨ Need booking, prices, free PCs, or schedule?',
      'All good! What do you need about the club?',
      'Solid—ask me about booking or rates anytime.',
    ]);
  }
  if (/(что\s*дела(ешь|ете)|чем\s*занима(ешь|етесь)|what are you doing)/u.test(q)) {
    if (isRu) {
      return pickVariant([
        'Помогаю с вопросами по клубу 🤖 Напиши коротко задачу — сразу подскажу.',
        'Сижу в справке и жду твой вопрос про бронь или тарифы.',
        'Отвечаю в чате BlackBears Play — что ищешь?',
      ]);
    }
    return pickVariant([
      'Helping with club questions 🤖 Send a short request and I will jump in.',
      'On chat duty for club stuff—what do you need?',
    ]);
  }
  if (/^(спасибо|благодарю|thanks|thank you)\b/u.test(q)) {
    if (isRu) {
      return pickVariant(['Пожалуйста! 🙌 Обращайся в любой момент.', 'Не за что! Если что — пиши.', 'Всегда пожалуйста ✨']);
    }
    return pickVariant(['You are welcome! 🙌 Ping me anytime.', 'Anytime!', 'Glad to help ✨']);
  }
  if (/^(пока|до\s*связи|bye|goodbye)\b/u.test(q)) {
    if (isRu) {
      return pickVariant([
        'До связи! 👋 Хорошего дня и приятной игры 🎮',
        'Пока! Удачи и кайфовой сессии 🎮',
        'Увидимся! Заходи ещё 👋',
      ]);
    }
    return pickVariant([
      'See you! 👋 Have a great day and fun games 🎮',
      'Bye! Have a good one 🎮',
    ]);
  }

  return null;
}

function withHelpfulEmoji(text: string, locale: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/\p{Extended_Pictographic}/u.test(trimmed)) return trimmed;
  const isRu = locale.startsWith('ru');
  const low = trimmed.toLowerCase();
  if (/брон|book|booking/u.test(low)) return `${trimmed} 📅`;
  if (/цена|стоим|price|tariff/u.test(low)) return `${trimmed} 💸`;
  if (/клуб|club|адрес|address/u.test(low)) return `${trimmed} 📍`;
  if (/пк|pc|компьютер|computer|seat/u.test(low)) return `${trimmed} 🖥️`;
  if (/график|час|время|schedule|time/u.test(low)) return `${trimmed} ⏰`;
  return `${trimmed} ${isRu ? '✨' : '✨'}`;
}

function toConciseReply(text: string): string {
  const normalized = text.replace(/\r/g, '').trim();
  if (!normalized) return '';
  const firstBlock = normalized.split('\n\n')[0]?.trim() ?? normalized;
  const compact = firstBlock.replace(/\s+/g, ' ').trim();
  if (compact.length <= 220) return compact;
  const cutAt = compact.lastIndexOf(' ', 220);
  const end = cutAt >= 120 ? cutAt : 220;
  return `${compact.slice(0, end).trim()}…`;
}

function normalizeUnitSpacing(text: string): string {
  return text
    .replace(/\b(\d+)\s*(мин(?:ут(?:а|ы)?)?)\b/giu, '$1 $2')
    .replace(/\b(\d+)\s*(ч|час(?:а|ов)?)\b/giu, '$1 $2');
}

function normalizeGluedWordSpacing(text: string): string {
  return text
    .replace(/([А-Яа-яЁёA-Za-z])(\d)/gu, '$1 $2')
    .replace(/(\d)([А-Яа-яЁёA-Za-z])/gu, '$1 $2')
    .replace(/([а-яё])([А-ЯЁ])/gu, '$1 $2');
}

function normalizePunctuationSpacing(text: string): string {
  return text.replace(/([,;:!?])(\S)/gu, (match, punctuation: string, next: string, offset: number) => {
    const prev = offset > 0 ? text[offset - 1] : '';
    if ((punctuation === ':' || punctuation === ',') && /\d/u.test(prev) && /\d/u.test(next)) {
      return match;
    }
    return `${punctuation} ${next}`;
  });
}

function normalizeInlineWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[^\S\r\n]+/gu, ' ').trimEnd())
    .join('\n');
}

function normalizeMarkdownTables(text: string): string {
  const lines = text.split('\n');
  const looksLikeTable = lines.some((line) => line.includes('|'));
  if (!looksLikeTable) return text;

  const normalized = lines.map((line) => {
    const raw = line.trim();
    if (!raw.includes('|') || raw.startsWith('```')) return line;

    const cells = raw
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) return line;

    // Unify markdown table rows to avoid broken separators/empty columns.
    const separatorLike = cells.every((c) => /^:?-{2,}:?$/.test(c));
    if (separatorLike) {
      return `| ${cells.map(() => '---').join(' | ')} |`;
    }
    return `| ${cells.join(' | ')} |`;
  });

  return normalized.join('\n');
}

function normalizeBotReplyText(text: string): string {
  const fixedSpacing = normalizeInlineWhitespace(
    normalizePunctuationSpacing(normalizeUnitSpacing(normalizeGluedWordSpacing(text.replace(/\r/g, '')))),
  );
  return normalizeMarkdownTables(fixedSpacing).trim();
}

/**
 * Ответы из базы знаний не «сплющиваем» в одну строку:
 * сохраняем переносы и делим длинные перечисления на пункты.
 */
function formatKnowledgeReply(text: string): string {
  const normalized = normalizeBotReplyText(text);
  if (!normalized) return '';
  if (normalized.includes('\n')) return normalized;

  const parts = normalized
    .split(/\s*;\s*/g)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return normalized;
  return parts.map((p) => `• ${p}`).join('\n');
}

/** Для ответа нейросети: длинее, чем toConciseReply. */
function trimNeuralDisplay(text: string, maxLen: number): string {
  const n = normalizeBotReplyText(text);
  if (n.length <= maxLen) return n;
  const cut = n.lastIndexOf(' ', maxLen);
  return `${n.slice(0, cut >= Math.floor(maxLen * 0.5) ? cut : maxLen).trim()}…`;
}

function buildRecentConversationContext(messages: Msg[], locale: string): string | undefined {
  const isRu = locale !== 'en';
  const roleUser = isRu ? 'Пользователь' : 'User';
  const roleBot = isRu ? 'Ассистент' : 'Assistant';
  const recent = messages
    .filter((m) => !m.id.startsWith('welcome-'))
    .slice(-6)
    .map((m) => `${m.role === 'user' ? roleUser : roleBot}: ${normalizeBotReplyText(m.text)}`.trim())
    .filter(Boolean);
  if (!recent.length) return undefined;
  return recent.join('\n');
}

export function KnowledgeChatScreen() {
  const { t, locale } = useLocale();
  const navigation = useNavigation<any>();
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const isNarrowScreen = screenWidth <= 360;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const entries = useKnowledgeEntries();
  const helpListRef = useRef<FlatList<Msg>>(null);
  const adminListRef = useRef<FlatList<AdminChatLine>>(null);
  const inputRef = useRef<RnTextInput>(null);

  const [input, setInput] = useState(
    () => (getOllamaConfig().apiKey ? knowledgeChatInputDraft.n : knowledgeChatInputDraft.k),
  );
  /** По умолчанию скрыто — больше места под переписку; раскрыть кнопкой «Показать подсказки». */
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [isChatBusy, setIsChatBusy] = useState(false);
  /** Офлайн — только БЗ; онлайн — БЗ или нейросеть (RAG). При настроенном ключе Ollama по умолчанию — нейросеть. */
  const [responseMode, setResponseMode] = useState<'knowledge' | 'neural'>(() =>
    getOllamaConfig().apiKey ? 'neural' : 'knowledge',
  );
  const netInfo = useIsOnline();
  /** `isInternetReachable` на телефонах часто `false` при рабочей сети; ориентируемся на `isConnected`. */
  const isOnline = netInfo.isConnected !== false;
  const ollamaReady = getOllamaConfig().apiKey.length > 0;
  const [preferredClubId, setPreferredClubId] = useState<number | null>(null);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [openPicker, setOpenPicker] = useState<'club' | 'date' | 'timeMins' | 'pc' | 'editParam' | null>(null);
  const isFilterPickerOpen = openPicker !== null;
  const prevOpenPickerRef = useRef<'club' | 'date' | 'timeMins' | 'pc' | 'editParam' | null>(null);
  const clubWheelRef = useRef<WheelPickerColumnHandle>(null);
  const cityWheelRef = useRef<WheelPickerColumnHandle>(null);
  const dateWheelRef = useRef<WheelPickerColumnHandle>(null);
  const timeWheelRef = useRef<WheelPickerColumnHandle>(null);
  const minsWheelRef = useRef<WheelPickerColumnHandle>(null);
  const [pendingClubIdx, setPendingClubIdx] = useState(0);
  const [pendingCityIdx, setPendingCityIdx] = useState(0);
  const [pendingDateIdx, setPendingDateIdx] = useState(0);
  const [pendingTimeIdx, setPendingTimeIdx] = useState(0);
  const [pendingMinsIdx, setPendingMinsIdx] = useState(0);
  const [pendingPcIdx, setPendingPcIdx] = useState(0);
  const [pendingEditParamIdx, setPendingEditParamIdx] = useState(0);
  const pickerBackdropOpacity = useRef(new Animated.Value(0.72)).current;
  const feedbackTimersRef = useRef<
    Record<string, { show?: ReturnType<typeof setTimeout>; hide?: ReturnType<typeof setTimeout> }>
  >({});
  const [threadKnowledge, setThreadKnowledge] = useState<Msg[]>([
    { id: 'welcome-kb', role: 'bot', text: t('chat.welcomeKnowledge') },
  ]);
  const [threadNeural, setThreadNeural] = useState<Msg[]>([
    { id: 'welcome-nn', role: 'bot', text: t('chat.welcomeNeural') },
  ]);
  const activeMessages = responseMode === 'knowledge' ? threadKnowledge : threadNeural;
  const setThreadByMode = (mode: 'knowledge' | 'neural', fn: (prev: Msg[]) => Msg[]) => {
    if (mode === 'knowledge') setThreadKnowledge(fn);
    else setThreadNeural(fn);
  };
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const booksQ = useMemberBooksQuery(user?.memberAccount);
  const nowMs = useBookingNowMs();
  const [adminUi, setAdminUi] = useState<'off' | 'active' | 'ended'>('off');
  const [adminMessages, setAdminMessages] = useState<AdminChatLine[]>([]);
  const [adminInput, setAdminInput] = useState('');
  const lastAdminActivityRef = useRef(0);
  const cancelBookingMut = useCancelBookingMutation();
  const cafesQ = useQuery({
    queryKey: queryKeys.cafes(),
    queryFn: () => cafesApi.list(),
    staleTime: 10 * 60 * 1000,
  });
  const bookingRows = useMemo(() => flattenMemberRows(booksQ.data), [booksQ.data]);
  const hasActiveStartedBooking = useMemo(() => {
    if (!user?.memberAccount?.trim()) return false;
    for (const { row } of bookingRows) {
      if (bookingRowLifecycleStatus(row, nowMs) === 'active') return true;
    }
    return false;
  }, [bookingRows, nowMs, user?.memberAccount]);

  useEffect(() => {
    void loadAppPreferences().then((prefs) => {
      setPreferredClubId(prefs.lastBookingClubId ?? prefs.favoriteClubId ?? null);
    });
  }, []);

  useEffect(() => {
    setThreadKnowledge((m) =>
      m.map((x) => (x.id === 'welcome-kb' ? { ...x, text: t('chat.welcomeKnowledge') } : x)),
    );
    setThreadNeural((m) =>
      m.map((x) => (x.id === 'welcome-nn' ? { ...x, text: t('chat.welcomeNeural') } : x)),
    );
  }, [locale, t]);

  const suggestions = useMemo(() => entries.slice(0, 8), [entries]);

  const scrollToBottom = (animated: boolean) => {
    requestAnimationFrame(() => {
      InteractionManager.runAfterInteractions(() => {
        if (adminUi === 'off') {
          helpListRef.current?.scrollToEnd({ animated });
        } else {
          adminListRef.current?.scrollToEnd({ animated });
        }
      });
    });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [threadKnowledge.length, threadNeural.length, responseMode, adminMessages.length, adminUi]);

  const openAdminSession = useCallback(() => {
    setOpenPicker(null);
    setAdminMessages([{ id: 'admin-welcome', role: 'system', text: t('chat.adminWelcome') }]);
    setAdminInput('');
    setAdminUi('active');
    lastAdminActivityRef.current = Date.now();
  }, [t]);

  const endAdminManual = useCallback(() => {
    setAdminMessages((m) => [
      ...m,
      { id: `sys-manual-${Date.now()}`, role: 'system', text: t('chat.adminEndedManual') },
    ]);
    setAdminUi('ended');
  }, [t]);

  const dismissAdminEnded = useCallback(() => {
    setAdminUi('off');
    setAdminMessages([]);
    setAdminInput('');
  }, []);

  const sendAdmin = useCallback(() => {
    const text = adminInput.trim();
    if (!text || adminUi !== 'active') return;
    setAdminMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', text }]);
    setAdminInput('');
    lastAdminActivityRef.current = Date.now();
  }, [adminInput, adminUi]);

  useEffect(() => {
    if (adminUi !== 'active') return;
    const id = setInterval(() => {
      if (!hasActiveStartedBooking) return;
      if (Date.now() - lastAdminActivityRef.current >= 5 * 60 * 1000) {
        setAdminMessages((m) => [
          ...m,
          { id: `sys-idle-${Date.now()}`, role: 'system', text: t('chat.adminEndedIdle') },
        ]);
        setAdminUi('ended');
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [adminUi, hasActiveStartedBooking, t]);

  useEffect(() => {
    if (adminUi !== 'active') return;
    if (hasActiveStartedBooking) return;
    setAdminMessages((m) => [
      ...m,
      { id: `sys-booking-${Date.now()}`, role: 'system', text: t('chat.adminEndedBooking') },
    ]);
    setAdminUi('ended');
  }, [adminUi, hasActiveStartedBooking, t]);

  const pickerDraft: BookingDraft = useMemo(
    () =>
      bookingDraft ?? {
        icafeId: preferredClubId,
        pcName: null,
        mins: 60,
        dateISO: null,
        hhmm: null,
        durationNeedsConfirm: false,
      },
    [bookingDraft, preferredClubId],
  );
  const clubOptions = useMemo(() => cafesQ.data ?? [], [cafesQ.data]);
  const pickerCities = useMemo(() => orderedCitiesForPicker(clubOptions), [clubOptions]);
  const pendingCityId =
    pickerCities[Math.max(0, Math.min(pickerCities.length - 1, pendingCityIdx))]?.id ?? DEFAULT_CITY_ID;
  const clubsInPendingCity = useMemo(() => cafesInCity(clubOptions, pendingCityId), [clubOptions, pendingCityId]);
  const cityWheelLabels = useMemo(
    () => pickerCities.map((c) => (locale === 'en' ? c.nameEn : c.nameRu)),
    [pickerCities, locale],
  );
  const dateOptions = useMemo(() => {
    const start = formatISODateMoscow(new Date());
    return Array.from({ length: 7 }, (_, i) => addCalendarDaysMoscow(start, i));
  }, []);
  const timeOptions = useMemo(() => {
    const d = pickerDraft.dateISO ?? formatISODateMoscow(new Date());
    return buildBookingTimeSlots(d);
  }, [pickerDraft.dateISO]);
  const pickerCafeId = pickerDraft.icafeId ?? preferredClubId ?? null;
  const pickerBookingDate = pickerDraft.dateISO ?? formatISODateMoscow(new Date());
  const pickerPricesQ = useQuery({
    queryKey:
      pickerCafeId != null
        ? queryKeys.allPrices({
            cafeId: pickerCafeId,
            memberId: user?.memberId?.trim() || undefined,
            mins: pickerDraft.mins ?? 60,
            bookingDate: pickerBookingDate,
          })
        : ['chat-picker-all-prices-empty'],
    enabled: pickerCafeId != null,
    queryFn: () =>
      bookingFlowApi.allPrices({
        cafeId: pickerCafeId!,
        memberId: user?.memberId?.trim() || undefined,
        mins: pickerDraft.mins ?? 60,
        bookingDate: pickerBookingDate,
      }),
    staleTime: 5 * 60 * 1000,
  });
  const pickerCafeProductsQ = useQuery({
    queryKey: queryKeys.cafeBookingProducts(pickerCafeId ?? 0),
    queryFn: () => fetchCafeBookingProducts(pickerCafeId!),
    enabled: pickerCafeId != null && !!user,
    staleTime: 5 * 60 * 1000,
  });
  const dateOptionLabels = useMemo(
    () => dateOptions.map((iso) => formatMoscowCalendarDayLong(iso, locale === 'en' ? 'en' : 'ru')),
    [dateOptions, locale],
  );
  const timeOptionLabels = useMemo(
    () =>
      timeOptions.map((slot) =>
        formatMoscowWallSlotForLocale(
          pickerDraft.dateISO ?? formatISODateMoscow(new Date()),
          slot,
          locale === 'en' ? 'en' : 'ru',
        ),
      ),
    [timeOptions, pickerDraft.dateISO, locale],
  );
  const minsOptions = useMemo(() => {
    const base = [...HOURLY_GRID_DURATION_MINUTES];
    const allPricesProducts = pickerPricesQ.data?.products ?? [];
    const cafeProducts = pickerCafeProductsQ.data ?? [];
    const useCafePackages = pickerCafeProductsQ.isSuccess && cafeProducts.length > 0;
    const mergedProducts = mergeBookingProductsCatalog(allPricesProducts, cafeProducts, useCafePackages);
    const packagePool = useCafePackages ? cafeProducts : mergedProducts;
    const products = dedupeBookingWheelPackagesByDuration(
      filterBookingWheelPackageProducts(packagePool),
      'GameZone',
    );
    const extras = products
      .map((p: ProductItem) => bookingPackageWheelDisplayMins(p, 60))
      .filter((m) => Number.isFinite(m) && m > 0 && !base.includes(m));
    return [...base, ...extras].sort((a, b) => a - b);
  }, [pickerPricesQ.data?.products, pickerCafeProductsQ.data, pickerCafeProductsQ.isSuccess]);
  const minsWheelItems = useMemo((): WheelPickerItem[] => {
    const allPricesProducts = pickerPricesQ.data?.products ?? [];
    const cafeProducts = pickerCafeProductsQ.data ?? [];
    const useCafePackages = pickerCafeProductsQ.isSuccess && cafeProducts.length > 0;
    const mergedProducts = mergeBookingProductsCatalog(allPricesProducts, cafeProducts, useCafePackages);
    const packagePool = useCafePackages ? cafeProducts : mergedProducts;
    const wheelPackages = dedupeBookingWheelPackagesByDuration(
      filterBookingWheelPackageProducts(packagePool),
      'GameZone',
    );
    const packageByMins = new Map<number, ProductItem>(
      wheelPackages.map((p) => [bookingPackageWheelDisplayMins(p, 60), p]),
    );

    return minsOptions.map((mins) => {
      const duration = formatBookingDurationHuman(mins, locale === 'en' ? 'en' : 'ru');
      const main = duration || `${mins} ${locale === 'en' ? 'min' : 'мин'}`;
      const pkg = packageByMins.get(mins);
      if (!pkg) return main;
      const pct = packageSavingPercentForWheel(pkg, pickerPricesQ.data?.prices ?? [], mergedProducts);
      if (pct == null) return main;
      return {
        main: locale === 'en' ? `${main} package` : `${main} пакет`,
        sub: t('booking.packageVsHourlyPercent', { n: pct }),
      };
    });
  }, [
    minsOptions,
    locale,
    t,
    pickerPricesQ.data?.products,
    pickerPricesQ.data?.prices,
    pickerCafeProductsQ.data,
    pickerCafeProductsQ.isSuccess,
  ]);
  const pickerPcDateISO = pickerDraft.dateISO ?? formatISODateMoscow(new Date());
  const pickerPcTimeHHmm = pickerDraft.hhmm ?? '00:00';
  const pickerPcMins = pickerDraft.mins ?? 60;
  const pickerStructQ = useQuery({
    queryKey: pickerCafeId != null ? queryKeys.structRooms(pickerCafeId) : ['chat-picker-struct-empty'],
    enabled: pickerCafeId != null && openPicker === 'pc',
    queryFn: () => bookingFlowApi.structRooms(pickerCafeId!),
    staleTime: 10 * 60 * 1000,
  });
  const pickerAvailablePcsQ = useQuery({
    queryKey:
      pickerCafeId != null
        ? queryKeys.availablePcs({
            cafeId: pickerCafeId,
            dateStart: pickerPcDateISO,
            timeStart: pickerPcTimeHHmm,
            mins: pickerPcMins,
            isFindWindow: false,
            priceName: '',
          })
        : ['chat-picker-available-pcs-empty'],
    enabled: pickerCafeId != null && openPicker === 'pc',
    queryFn: () =>
      bookingFlowApi.availablePcs({
        cafeId: pickerCafeId!,
        dateStart: pickerPcDateISO,
        timeStart: pickerPcTimeHHmm,
        mins: pickerPcMins,
        isFindWindow: false,
        priceName: '',
      }),
    staleTime: 15 * 1000,
  });
  const pcItems = useMemo(() => {
    const byLower = new Map<string, PcListItem>();
    for (const raw of pickerAvailablePcsQ.data?.pc_list ?? []) {
      const name = String(raw.pc_name || '').trim();
      if (!name) continue;
      const k = name.toLowerCase();
      if (!byLower.has(k)) byLower.set(k, { ...raw, pc_name: name });
    }
    return [...byLower.values()];
  }, [pickerAvailablePcsQ.data?.pc_list]);
  const pcOptions = useMemo(() => pcItems.map((x) => x.pc_name), [pcItems]);
  const pcListSections = useMemo(() => {
    const buckets: Record<PcZoneKind, PcListItem[]> = { GameZone: [], BootCamp: [], VIP: [], Other: [] };
    for (const pc of pcItems) buckets[pcZoneKindFromPc(pc)].push(pc);
    const zoneLabel = (zone: PcZoneKind) => {
      if (zone === 'GameZone') return locale === 'en' ? 'GameZone tariff' : 'Тариф GameZone';
      if (zone === 'BootCamp') return locale === 'en' ? 'BootCamp tariff' : 'Тариф BootCamp';
      if (zone === 'VIP') return locale === 'en' ? 'VIP tariff' : 'Тариф VIP';
      return locale === 'en' ? 'Other' : 'Другое';
    };
    return (['GameZone', 'BootCamp', 'VIP', 'Other'] as const)
      .map((zone) => ({ key: zone, title: zoneLabel(zone), items: buckets[zone] }))
      .filter((s) => s.items.length > 0);
  }, [pcItems, locale]);
  const editParamOptions = useMemo(() => {
    const picked = bookingDraft ?? {
      icafeId: null,
      pcName: null,
      mins: null,
      dateISO: null,
      hhmm: null,
      durationNeedsConfirm: false,
    };
    const out: Array<{ key: 'club' | 'date' | 'timeMins' | 'pc'; label: string }> = [];
    if (picked.icafeId != null) out.push({ key: 'club', label: locale === 'en' ? 'Club' : 'Клуб' });
    if (picked.dateISO) out.push({ key: 'date', label: locale === 'en' ? 'Date' : 'Дата' });
    if (picked.hhmm && picked.mins != null) {
      out.push({ key: 'timeMins', label: locale === 'en' ? 'Time and duration' : 'Время и длительность' });
    }
    if (picked.pcName) out.push({ key: 'pc', label: locale === 'en' ? 'PC' : 'ПК' });
    return out;
  }, [bookingDraft, locale]);
  const [pcPickerViewMode, setPcPickerViewMode] = useState<'scheme' | 'list'>('scheme');
  const pickerPcAvailability = useMemo(() => {
    const out: Record<string, 'selected' | 'busy' | 'free' | 'unknown' | 'liveBusy'> = {};
    const pendingSelected =
      openPicker === 'pc' && pcOptions.length
        ? pcOptions[Math.max(0, Math.min(pcOptions.length - 1, pendingPcIdx))] ?? ''
        : '';
    const selected = (pendingSelected || pickerDraft.pcName || '').trim();
    for (const pc of pickerAvailablePcsQ.data?.pc_list ?? []) {
      const name = String(pc.pc_name || '').trim();
      if (!name) continue;
      out[name] = pcNamesLooselyEqual(name, selected) ? 'selected' : pc.is_using ? 'busy' : 'free';
    }
    return out;
  }, [openPicker, pendingPcIdx, pcOptions, pickerAvailablePcsQ.data?.pc_list, pickerDraft.pcName]);

  useEffect(() => {
    if (!openPicker) return;
    if (openPicker === 'club' && pickerCities.length) {
      const match = pickerDraft.icafeId != null ? clubOptions.find((c) => c.icafe_id === pickerDraft.icafeId) : null;
      const cityId = match ? pickerCities.find((x) => cafesInCity(clubOptions, x.id).some((c) => c.icafe_id === match.icafe_id))?.id : null;
      const cityIdx = cityId ? Math.max(0, pickerCities.findIndex((c) => c.id === cityId)) : 0;
      setPendingCityIdx(cityIdx);
      const pool = cafesInCity(clubOptions, pickerCities[cityIdx]?.id ?? DEFAULT_CITY_ID);
      const clubIdx = match ? Math.max(0, pool.findIndex((c) => c.icafe_id === match.icafe_id)) : 0;
      setPendingClubIdx(clubIdx);
    }
    if (openPicker === 'date' && dateOptions.length && pickerDraft.dateISO) {
      const idx = dateOptions.indexOf(pickerDraft.dateISO);
      if (idx >= 0) setPendingDateIdx(idx);
    }
    if (openPicker === 'timeMins' && timeOptions.length && pickerDraft.hhmm) {
      const idx = timeOptions.indexOf(pickerDraft.hhmm);
      if (idx >= 0) setPendingTimeIdx(idx);
    }
    if (openPicker === 'timeMins' && minsOptions.length && pickerDraft.mins) {
      const idx = minsOptions.indexOf(pickerDraft.mins);
      if (idx >= 0) setPendingMinsIdx(idx);
    }
    if (openPicker === 'pc' && pcOptions.length && pickerDraft.pcName) {
      const idx = pcOptions.findIndex((x) => pcNamesLooselyEqual(x, pickerDraft.pcName ?? ''));
      if (idx >= 0) setPendingPcIdx(idx);
    }
    if (openPicker === 'editParam') {
      setPendingEditParamIdx(0);
    }
  }, [openPicker, clubOptions, pickerCities, dateOptions, timeOptions, minsOptions, pcOptions, pickerDraft]);

  useEffect(() => {
    const prev = prevOpenPickerRef.current;
    if (prev && !openPicker) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    prevOpenPickerRef.current = openPicker;
    if (openPicker) pickerBackdropOpacity.setValue(0.72);
  }, [openPicker]);
  const popularPrompts = useMemo(
    () => [
      t('chat.popularBooking'),
      t('chat.popularHours'),
      t('chat.popularPricing'),
    ],
    [t],
  );

  useEffect(() => {
    if (netInfo.isConnected === false) {
      setResponseMode('knowledge');
    }
  }, [netInfo.isConnected]);

  useEffect(() => {
    return () => {
      const pending = feedbackTimersRef.current;
      for (const id of Object.keys(pending)) {
        const timers = pending[id];
        if (timers?.show) clearTimeout(timers.show);
        if (timers?.hide) clearTimeout(timers.hide);
        delete pending[id];
      }
    };
  }, []);

  const recordHelpfulness = (msgId: string, helpful: 'up' | 'down') => {
    const modeAtFeedback = responseMode;
    setThreadByMode(responseMode, (prev) => {
      const userQuery = getPrecedingUserText(prev, msgId);
      const next = prev.map((x) =>
        x.id === msgId
          ? { ...x, feedback: helpful, feedbackThanksVisible: false, feedbackThanksHidden: false }
          : x,
      );
      const bot = next.find((x) => x.id === msgId);
      if (bot?.role === 'bot') {
        void upsertPendingKnowledgeChatFeedback({
          messageId: msgId,
          userQuery,
          botReply: bot.text,
          helpful,
          locale,
        });
      }
      return next;
    });
    const existing = feedbackTimersRef.current[msgId];
    if (existing?.show) clearTimeout(existing.show);
    if (existing?.hide) clearTimeout(existing.hide);
    feedbackTimersRef.current[msgId] = {};
    feedbackTimersRef.current[msgId].show = setTimeout(() => {
      setThreadByMode(modeAtFeedback, (prev) =>
        prev.map((x) =>
          x.id === msgId ? { ...x, feedbackThanksVisible: true, feedbackThanksHidden: false } : x,
        ),
      );
      const current = feedbackTimersRef.current[msgId] ?? {};
      current.hide = setTimeout(() => {
        setThreadByMode(modeAtFeedback, (prev) =>
          prev.map((x) => (x.id === msgId ? { ...x, feedbackThanksHidden: true } : x)),
        );
        delete feedbackTimersRef.current[msgId];
      }, 5000);
      feedbackTimersRef.current[msgId] = current;
    }, 1000);
  };

  const applyDraftAndRespond = (
    nextDraft: BookingDraft,
    changed: 'club' | 'date' | 'timeMins' | 'pc',
    selectedLabel: string,
  ) => {
    setBookingDraft(nextDraft);
    const miss = bookingDraftMissing(nextDraft);
    const isRu = locale !== 'en';
    const clubLabel =
      nextDraft.icafeId != null
        ? formatClubAddressLabelWithCity(clubOptions.find((c) => c.icafe_id === nextDraft.icafeId))
        : isRu ? '—' : '-';
    const dateLabel = nextDraft.dateISO
      ? formatMoscowCalendarDayLong(nextDraft.dateISO, locale === 'en' ? 'en' : 'ru')
      : isRu
        ? '—'
        : '-';
    const timeLabel =
      nextDraft.dateISO && nextDraft.hhmm
        ? formatMoscowWallSlotForLocale(nextDraft.dateISO, nextDraft.hhmm, locale === 'en' ? 'en' : 'ru')
        : isRu
          ? '—'
          : '-';
    const minsLabel = nextDraft.mins != null ? `${nextDraft.mins} ${isRu ? 'мин' : 'min'}` : isRu ? '—' : '-';
    const pcLabel = nextDraft.pcName ?? (isRu ? '—' : '-');
    const ask =
      miss.length === 0
        ? `${isRu ? 'Клуб' : 'Club'}: ${clubLabel}\n${isRu ? 'Дата' : 'Date'}: ${dateLabel}\n${isRu ? 'Время' : 'Time'}: ${timeLabel}\n${isRu ? 'Длительность' : 'Duration'}: ${minsLabel}\n${isRu ? 'ПК' : 'PC'}: ${pcLabel}\n\n${
            isRu ? 'Параметры готовы. Подтверждаем бронь или хотите что-то поменять?' : 'All parameters are set. Confirm booking or change something?'
          }`
        : miss[0] === 'club'
          ? `${isRu ? 'Клуб' : 'Club'}: ${clubLabel}\n${isRu ? 'Выберите клуб:' : 'Choose club:'}`
          : miss[0] === 'date'
            ? `${isRu ? 'Клуб' : 'Club'}: ${clubLabel}\n${isRu ? 'Выберите дату:' : 'Choose date:'}`
            : miss[0] === 'time' || miss[0] === 'mins'
              ? `${isRu ? 'Клуб' : 'Club'}: ${clubLabel}\n${isRu ? 'Дата' : 'Date'}: ${dateLabel}\n${isRu ? 'Выберите время и длительность:' : 'Choose time and duration:'}`
              : `${isRu ? 'Клуб' : 'Club'}: ${clubLabel}\n${isRu ? 'Дата' : 'Date'}: ${dateLabel}\n${isRu ? 'Время' : 'Time'}: ${timeLabel}\n${isRu ? 'Длительность' : 'Duration'}: ${minsLabel}\n${isRu ? 'Выберите ПК (схема или список):' : 'Choose PC (scheme or list):'}`;
    setThreadByMode(responseMode, (m) => {
      const nextMessages = m.filter((x) => !(x.role === 'bot' && x.id.startsWith('bf-')));
      for (let i = nextMessages.length - 1; i >= 0; i -= 1) {
        const msg = nextMessages[i];
        if (!msg || msg.role !== 'bot') continue;
        if (msg.actions?.length || msg.cta || msg.actionsTitle) {
          nextMessages.splice(i, 1);
          break;
        }
      }
      nextMessages.push({
        id: `bf-${Date.now()}`,
        role: 'bot',
        text: ask,
        cta: ctaForDraft(nextDraft, t),
        actions: bookingDraftActions(nextDraft, locale, clubOptions, preferredClubId),
        actionsTitle: bookingActionsTitle(nextDraft, locale),
      });
      return nextMessages;
    });
  };

  const setInputWithDraft = (next: string) => {
    if (responseMode === 'knowledge') knowledgeChatInputDraft.k = next;
    else knowledgeChatInputDraft.n = next;
    setInput(next);
  };

  const applyResponseMode = (next: 'knowledge' | 'neural') => {
    if (next === responseMode) return;
    if (responseMode === 'knowledge') knowledgeChatInputDraft.k = input;
    else knowledgeChatInputDraft.n = input;
    setResponseMode(next);
    setInput(next === 'knowledge' ? knowledgeChatInputDraft.k : knowledgeChatInputDraft.n);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const modeAtSend = responseMode;
    const threadAtSend = modeAtSend === 'knowledge' ? threadKnowledge : threadNeural;
    const conversationContext = buildRecentConversationContext(threadAtSend, locale);
    const appendBot = (msg: Msg) => {
      setThreadByMode(modeAtSend, (m) => [...m, msg]);
    };
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    setThreadByMode(modeAtSend, (m) => [...m, userMsg]);
    setInputWithDraft('');
    setPromptsOpen(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
    setIsChatBusy(true);
    const ollamaCfg = getOllamaConfig();
    try {
      const command = detectChatCommand(trimmed);
      const shouldContinueDraft =
        bookingDraft != null &&
        command !== 'cancel' &&
        command !== 'nearest' &&
        isBookingDraftContinuationInput(trimmed, cafesQ.data ?? []);
      if (shouldContinueDraft) {
        let llmEx: BookingLlmExtraction | null = null;
        if (modeAtSend === 'neural' && isOnline && ollamaReady) {
          const pureConfirm = hasConfirmIntent(trimmed) && trimmed.length < 40 && !userMentionsExplicitPc(trimmed);
          if (!pureConfirm) {
            try {
              llmEx = await extractBookingWithOllama(
                trimmed,
                locale,
                formatISODateMoscow(new Date()),
              );
            } catch (e) {
              if (__DEV__) console.warn('[booking-llm]', e);
            }
          }
        }
        const stepReply = await handleBookingDraftStep({
          text: trimmed,
          draft: bookingDraft,
          setDraft: setBookingDraft,
          user,
          rows: bookingRows,
          cafes: cafesQ.data ?? [],
          preferredClubId,
          t,
          locale,
          llmExtraction: llmEx,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.books(user?.memberAccount) });
        appendBot({ id: `b-${Date.now()}`, role: 'bot', ...stepReply });
        return;
      }
      if (bookingDraft && (command === 'cancel' || command === 'nearest')) {
        setBookingDraft(null);
      }
      if (command === 'book') {
        let llmEx2: BookingLlmExtraction | null = null;
        if (modeAtSend === 'neural' && isOnline && ollamaReady) {
          try {
            llmEx2 = await extractBookingWithOllama(trimmed, locale, formatISODateMoscow(new Date()));
          } catch (e) {
            if (__DEV__) console.warn('[booking-llm]', e);
          }
        }
        const reply = await handleBookByChat({
          text: trimmed,
          rows: bookingRows,
          user,
          cafes: cafesQ.data ?? [],
          preferredClubId,
          t,
          locale,
          setDraft: setBookingDraft,
          llmExtraction: llmEx2,
        });
        if (reply.didBook) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.books(user?.memberAccount) });
        }
        appendBot({
          id: `b-${Date.now()}`,
          role: 'bot',
          text: reply.text,
          cta: reply.cta,
          actions: reply.actions,
          actionsTitle: reply.actionsTitle,
        });
        return;
      }
      if (command === 'cancel') {
        const reply = await handleCancelByChat({
          rows: bookingRows,
          cancel: (params) => cancelBookingMut.mutateAsync(params),
          t,
          locale,
        });
        appendBot({ id: `b-${Date.now()}`, role: 'bot', text: reply });
        return;
      }
      if (command === 'nearest') {
        const reply = await handleNearestByChat({
          text: trimmed,
          rows: bookingRows,
          cafes: cafesQ.data ?? [],
          preferredClubId,
          locale,
          t,
        });
        appendBot({
          id: `b-${Date.now()}`,
          role: 'bot',
          text: reply.text,
          cta: reply.cta,
          actions: reply.actions,
          actionsTitle: reply.actionsTitle,
        });
        return;
      }

      const liveAvailability = await buildLiveAvailabilityInfo({
        text: trimmed,
        locale,
        cafes: cafesQ.data ?? [],
        draft: bookingDraft ?? pickerDraft,
        preferredClubId,
      });
      if (liveAvailability && modeAtSend === 'knowledge') {
        appendBot({
          id: `b-${Date.now()}`,
          role: 'bot',
          text: liveAvailability.directReply,
        });
        return;
      }

      const wantNeural = isOnline && modeAtSend === 'neural' && ollamaCfg.apiKey.length > 0;
      let ollamaRequestFailed = false;
      if (wantNeural) {
        try {
          const rawLlm = await completeWithOllamaRag({
            userQuestion: trimmed,
            allEntries: entries,
            locale,
            runtimeContext: liveAvailability?.promptContext,
            conversationContext,
          });
          const hitNav = bestKnowledgeEntry(trimmed, entries);
          const helpNav = helpContextActions({
            userQuery: trimmed,
            knowledgeEntryId: hitNav?.id ?? null,
            knowledgeCategory: hitNav?.category ?? null,
            t,
          });
          appendBot({
            id: `b-${Date.now()}`,
            role: 'bot',
            text: trimNeuralDisplay(rawLlm, 2000),
            actions: helpNav?.actions,
            actionsTitle: helpNav?.actionsTitle,
          });
          return;
        } catch (err) {
          ollamaRequestFailed = true;
          if (__DEV__ && err instanceof OllamaRagError) {
            console.warn('[ollama]', err.code, err.message);
          }
        }
      }

      let prefix: string | null = null;
      if (isOnline && modeAtSend === 'neural' && !ollamaCfg.apiKey.length) {
        prefix = t('chat.ollamaNoKey');
      } else if (ollamaRequestFailed) {
        prefix = t('chat.ollamaError');
      }

      const hit = bestKnowledgeEntry(trimmed, entries);
      const casualReply = casualSmalltalkFallback(trimmed, locale);
      const emotionalReply = emotionalSupportFallback(trimmed, locale);
      const rawReply = casualReply
        ? casualReply
        : hit
          ? hit.answer
          : emotionalReply
            ? emotionalReply
            : t('chat.noResults');
      const displayReply = hit ? formatKnowledgeReply(rawReply) : toConciseReply(rawReply);
      const baseReply = withHelpfulEmoji(normalizeBotReplyText(displayReply), locale);
      const reply = prefix ? `${prefix}\n\n${baseReply}` : baseReply;
      const skipHelpActions = Boolean(casualReply || emotionalReply);
      const helpNav = skipHelpActions
        ? null
        : helpContextActions({
            userQuery: trimmed,
            knowledgeEntryId: hit?.id ?? null,
            knowledgeCategory: hit?.category ?? null,
            t,
          });
      appendBot({
        id: `b-${Date.now()}`,
        role: 'bot',
        text: reply,
        actions: helpNav?.actions,
        actionsTitle: helpNav?.actionsTitle,
      });
    } catch (err) {
      const msg = formatPublicErrorMessage(err, t, 'booking.errorGeneric');
      appendBot({ id: `b-${Date.now()}`, role: 'bot', text: msg });
    } finally {
      setIsChatBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <TodaysBookingBanner />
      {hasActiveStartedBooking && adminUi === 'off' ? (
        <View style={styles.adminEntryWrap}>
          <Pressable
            style={styles.adminEntryBtn}
            onPress={openAdminSession}
            accessibilityRole="button"
            accessibilityLabel={t('chat.adminOpenButton')}
          >
            <Text style={styles.adminEntryBtnText}>{t('chat.adminOpenButton')}</Text>
          </Pressable>
        </View>
      ) : null}
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <TabScreenTopBar
          title={adminUi === 'off' ? t('tabs.help') : t('chat.adminTitle')}
          horizontalPadding={16}
          rightAccessory={
            adminUi === 'active' ? (
              <Pressable
                onPress={endAdminManual}
                style={({ pressed }) => (pressed ? { opacity: 0.72 } : null)}
                accessibilityRole="button"
                accessibilityLabel={t('chat.adminEndButton')}
              >
                <Text style={styles.adminTopBarEnd}>{t('chat.adminEndButton')}</Text>
              </Pressable>
            ) : null
          }
        />

        {adminUi === 'off' && isOnline ? (
          <View style={styles.modeRow}>
            <Text style={styles.modeLabel}>{t('chat.modeSourceLabel')}</Text>
            <View style={styles.seatViewToggleRow} accessibilityRole="tablist">
              <Pressable
                style={[
                  styles.seatViewToggleBtn,
                  responseMode === 'knowledge' ? styles.seatViewToggleBtnActive : null,
                ]}
                onPress={() => applyResponseMode('knowledge')}
                accessibilityRole="tab"
                accessibilityState={{ selected: responseMode === 'knowledge' }}
              >
                <Text
                  style={[
                    styles.seatViewToggleText,
                    responseMode === 'knowledge' ? { color: colors.text } : null,
                  ]}
                >
                  {t('chat.modeKnowledge')}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.seatViewToggleBtn,
                  responseMode === 'neural' ? styles.seatViewToggleBtnActive : null,
                  !ollamaReady ? { opacity: 0.5 } : null,
                ]}
                disabled={!ollamaReady}
                onPress={() => ollamaReady && applyResponseMode('neural')}
                accessibilityRole="tab"
                accessibilityState={{ selected: responseMode === 'neural' }}
              >
                <Text
                  style={[
                    styles.seatViewToggleText,
                    responseMode === 'neural' ? { color: colors.text } : null,
                  ]}
                >
                  {t('chat.modeNeural')}
                </Text>
              </Pressable>
            </View>
            {!ollamaReady ? <Text style={styles.modeKeyHint}>{t('chat.ollamaKeyHint')}</Text> : null}
          </View>
        ) : null}
        {adminUi === 'off' && !isOnline ? (
          <View style={styles.modeRow}>
            <Text style={styles.offlineModeHint}>{t('chat.offlineKnowledgeOnly')}</Text>
          </View>
        ) : null}

        {adminUi === 'off' ? (
        <FlatList
          ref={helpListRef}
          style={styles.listFlex}
          data={activeMessages}
          keyExtractor={(m) => m.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          renderItem={({ item }) => (
            <View style={[styles.msgItem, item.role === 'user' ? styles.msgItemUser : styles.msgItemBot]}>
              <View
                style={[
                  styles.bubble,
                  item.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
                ]}
              >
                <Text style={item.role === 'user' ? styles.tUser : styles.tBot}>{item.text}</Text>
                {item.role === 'bot' && item.cta ? (
                  <Pressable
                    style={styles.ctaBtn}
                    onPress={() => {
                      navigation.navigate('Booking', { prefill: item.cta?.prefill });
                    }}
                  >
                    <Text style={styles.ctaBtnText}>{item.cta.label}</Text>
                  </Pressable>
                ) : null}
                {item.role === 'bot' && item.actions?.length ? (
                  <View style={styles.actionPanel}>
                    {item.actionsTitle?.trim() ? (
                      <Text style={styles.actionPanelTitle} accessibilityRole="text">
                        {item.actionsTitle}
                      </Text>
                    ) : null}
                    <View style={styles.actionRow}>
                      {item.actions.map((a, idx) => (
                        <Pressable
                          key={`${item.id}-a-${idx}`}
                          style={[styles.actionChip, isFilterPickerOpen ? styles.quickActionDisabled : null]}
                          disabled={isFilterPickerOpen}
                          onPress={() => {
                            if (isFilterPickerOpen) return;
                            if (a.openFilter) {
                              const nextFilter = a.openFilter;
                              Keyboard.dismiss();
                              setOpenPicker((cur) => (cur === nextFilter ? null : nextFilter));
                              return;
                            }
                            if (a.sendText) {
                              void send(a.sendText);
                              return;
                            }
                            if (a.navigate) {
                              if (a.navigate === 'profileTopUp') {
                                navigation.navigate('Profile', { screen: 'ProfileHome', params: { openTopUp: true } });
                                return;
                              }
                              if (a.navigate === 'profileHome') {
                                navigation.navigate('Profile', { screen: 'ProfileHome' });
                                return;
                              }
                              if (a.navigate === 'balanceHistory') {
                                navigation.navigate('Profile', { screen: 'BalanceHistory' });
                                return;
                              }
                              if (a.navigate === 'settings') {
                                navigation.navigate('Profile', { screen: 'Settings' });
                                return;
                              }
                              if (a.navigate === 'food') {
                                navigation.navigate('Food');
                                return;
                              }
                              if (a.navigate === 'cafes') {
                                navigation.navigate('Cafes');
                                return;
                              }
                              if (a.navigate === 'news') {
                                navigation.navigate('Profile', { screen: 'News' });
                                return;
                              }
                              if (a.navigate === 'profileDice') {
                                navigation.navigate('Profile', { screen: 'ProfileHome', params: { openDice: true } });
                              }
                              return;
                            }
                            if (a.openBooking) {
                              navigation.navigate('Booking', a.prefill ? { prefill: a.prefill } : undefined);
                            }
                          }}
                        >
                          <Text style={styles.actionChipText}>{a.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
              {item.role === 'bot' && item.id !== 'welcome' && !item.feedbackThanksHidden ? (
                <View style={styles.feedbackRow} accessibilityRole={item.feedbackThanksVisible ? undefined : 'toolbar'}>
                  {item.feedbackThanksVisible ? (
                    <Text style={styles.feedbackThanksText} accessibilityRole="text">
                      {t('chat.feedbackThanks')}
                    </Text>
                  ) : (
                    <>
                      <Pressable
                        style={[
                          styles.feedbackBtn,
                          item.feedback === 'up' ? styles.feedbackBtnSelected : null,
                          isFilterPickerOpen ? styles.quickActionDisabled : null,
                        ]}
                        disabled={isFilterPickerOpen}
                        onPress={() => {
                          if (isFilterPickerOpen) return;
                          recordHelpfulness(item.id, 'up');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('chat.feedbackUpA11y')}
                        accessibilityState={{ disabled: isFilterPickerOpen, selected: item.feedback === 'up' }}
                      >
                        <Text style={styles.feedbackBtnText}>👍</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.feedbackBtn,
                          item.feedback === 'down' ? styles.feedbackBtnSelected : null,
                          isFilterPickerOpen ? styles.quickActionDisabled : null,
                        ]}
                        disabled={isFilterPickerOpen}
                        onPress={() => {
                          if (isFilterPickerOpen) return;
                          recordHelpfulness(item.id, 'down');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('chat.feedbackDownA11y')}
                        accessibilityState={{ disabled: isFilterPickerOpen, selected: item.feedback === 'down' }}
                      >
                        <Text style={styles.feedbackBtnText}>👎</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          )}
          contentContainerStyle={styles.list}
          onLayout={() => scrollToBottom(false)}
          onContentSizeChange={() => scrollToBottom(true)}
        />
        ) : (
        <FlatList<AdminChatLine>
          ref={adminListRef}
          style={styles.listFlex}
          data={adminMessages}
          keyExtractor={(m) => m.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          renderItem={({ item }) =>
            item.role === 'system' ? (
              <View style={styles.msgItemSystem}>
                <Text style={styles.tSystem}>{item.text}</Text>
              </View>
            ) : (
              <View style={[styles.msgItem, styles.msgItemUser]}>
                <View style={[styles.bubble, styles.bubbleUser]}>
                  <Text style={styles.tUser}>{item.text}</Text>
                </View>
              </View>
            )
          }
          contentContainerStyle={styles.list}
          onLayout={() => scrollToBottom(false)}
          onContentSizeChange={() => scrollToBottom(true)}
        />
        )}

        {adminUi === 'off' ? (
        <>
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
                    style={[styles.chip, isFilterPickerOpen ? styles.quickActionDisabled : null]}
                    disabled={isFilterPickerOpen}
                    onPress={() => {
                      if (isFilterPickerOpen) return;
                      void send(s.question);
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

        <View style={styles.popularRow}>
          {popularPrompts.map((p) => (
            <Pressable
              key={p}
              style={[styles.popularChip, isFilterPickerOpen ? styles.quickActionDisabled : null]}
              disabled={isFilterPickerOpen}
              onPress={() => {
                if (isFilterPickerOpen) return;
                void send(p);
              }}
            >
              <Text style={styles.popularChipText}>{p}</Text>
            </Pressable>
          ))}
        </View>
        </>
        ) : null}

        {adminUi === 'active' ? (
        <View style={[styles.inputRow, isNarrowScreen ? styles.inputRowCompact : null]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, isNarrowScreen ? styles.inputCompact : null]}
            placeholder={t('chat.adminPlaceholder')}
            placeholderTextColor={colors.muted}
            value={adminInput}
            onChangeText={(text) => {
              setAdminInput(text);
              lastAdminActivityRef.current = Date.now();
            }}
            onSubmitEditing={() => {
              void sendAdmin();
            }}
            blurOnSubmit
            returnKeyType="send"
            editable={!isChatBusy}
          />
          <Pressable
            style={[styles.sendBtn, isNarrowScreen ? styles.sendBtnCompact : null]}
            onPress={() => {
              inputRef.current?.blur();
              void sendAdmin();
            }}
          >
            <Text style={styles.sendText}>→</Text>
          </Pressable>
        </View>
        ) : null}
        {adminUi === 'ended' ? (
        <View style={styles.adminEndedRow}>
          <Pressable
            style={styles.adminEndedBtn}
            onPress={dismissAdminEnded}
            accessibilityRole="button"
            accessibilityLabel={t('chat.adminBackToHelp')}
          >
            <Text style={styles.adminEndedBtnText}>{t('chat.adminBackToHelp')}</Text>
          </Pressable>
        </View>
        ) : null}
        {adminUi === 'off' ? (
        <View style={[styles.inputRow, isNarrowScreen ? styles.inputRowCompact : null]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, isNarrowScreen ? styles.inputCompact : null]}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInputWithDraft}
            onSubmitEditing={() => {
              void send(input);
            }}
            blurOnSubmit
            returnKeyType="send"
            editable={!isChatBusy}
          />
          <Pressable
            style={[
              styles.sendBtn,
              isNarrowScreen ? styles.sendBtnCompact : null,
              isChatBusy ? styles.sendBtnDisabled : null,
            ]}
            disabled={isChatBusy}
            onPress={() => {
              inputRef.current?.blur();
              void send(input);
            }}
          >
            <Text style={styles.sendText}>→</Text>
          </Pressable>
        </View>
        ) : null}

        <Modal
          visible={openPicker === 'club'}
          animationType="fade"
          transparent
          onRequestClose={() => setOpenPicker(null)}
          presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        >
          <View style={styles.sheetModalRoot}>
            <Animated.View style={[styles.sheetModalSpacer, { opacity: pickerBackdropOpacity }]}>
              <Pressable style={styles.sheetModalBackdropHit} onPress={() => setOpenPicker(null)} />
            </Animated.View>
            <DraggableWheelSheet
              open={openPicker === 'club'}
              onRequestClose={() => setOpenPicker(null)}
              onDragOffsetChange={(offset, max) => {
                const k = max > 1 ? Math.min(1, Math.max(0, offset / max)) : 0;
                pickerBackdropOpacity.setValue(0.72 * (1 - k));
              }}
              colors={colors}
              sheetStyle={styles.sheet}
            >
              <Text style={styles.sheetTitle}>{locale === 'en' ? 'Choose club' : 'Выбрать клуб'}</Text>
              <View style={styles.wheelDualLabelsRow}>
                <View style={styles.wheelDualColCity}>
                  <Text style={styles.wheelDualColLabel}>{locale === 'en' ? 'City' : 'Город'}</Text>
                </View>
                <View style={styles.wheelDualColClub}>
                  <Text style={styles.wheelDualColLabel}>{locale === 'en' ? 'Club / address' : 'Клуб / адрес'}</Text>
                </View>
              </View>
              <View style={styles.wheelDualRow}>
                <View style={styles.wheelDualColCity}>
                  <WheelPickerColumn
                    ref={cityWheelRef}
                    active={openPicker === 'club'}
                    data={cityWheelLabels}
                    valueIndex={Math.min(pendingCityIdx, Math.max(0, cityWheelLabels.length - 1))}
                    onChangeIndex={(i) => {
                      setPendingCityIdx(i);
                      setPendingClubIdx(0);
                    }}
                    colors={colors}
                  />
                </View>
                <View style={styles.wheelDualColClub}>
                  <WheelPickerColumn
                    ref={clubWheelRef}
                    active={openPicker === 'club'}
                    data={clubsInPendingCity.map((c) => formatClubAddressLabel(c))}
                    valueIndex={Math.min(pendingClubIdx, Math.max(0, clubsInPendingCity.length - 1))}
                    onChangeIndex={setPendingClubIdx}
                    colors={colors}
                  />
                </View>
              </View>
              <Pressable
                style={styles.wheelDone}
                onPress={() => {
                  const ci = Math.min(
                    Math.max(0, cityWheelRef.current?.getCenterIndex() ?? pendingCityIdx),
                    Math.max(0, pickerCities.length - 1),
                  );
                  const cityId = pickerCities[ci]?.id ?? DEFAULT_CITY_ID;
                  const pool = cafesInCity(clubOptions, cityId);
                  const i = Math.min(
                    Math.max(0, clubWheelRef.current?.getCenterIndex() ?? pendingClubIdx),
                    Math.max(0, pool.length - 1),
                  );
                  const row = pool[i];
                  if (row) {
                    const nextDraft = { ...(bookingDraft ?? pickerDraft), icafeId: row.icafe_id };
                    applyDraftAndRespond(nextDraft, 'club', formatClubAddressLabelWithCity(row));
                  }
                  setOpenPicker(null);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
              >
                <Text style={styles.wheelDoneText}>{locale === 'en' ? 'Done' : 'Готово'}</Text>
              </Pressable>
            </DraggableWheelSheet>
          </View>
        </Modal>

        <Modal
          visible={openPicker === 'date'}
          animationType="fade"
          transparent
          onRequestClose={() => setOpenPicker(null)}
          presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        >
          <View style={styles.sheetModalRoot}>
            <Animated.View style={[styles.sheetModalSpacer, { opacity: pickerBackdropOpacity }]}>
              <Pressable style={styles.sheetModalBackdropHit} onPress={() => setOpenPicker(null)} />
            </Animated.View>
            <DraggableWheelSheet
              open={openPicker === 'date'}
              onRequestClose={() => setOpenPicker(null)}
              onDragOffsetChange={(offset, max) => {
                const k = max > 1 ? Math.min(1, Math.max(0, offset / max)) : 0;
                pickerBackdropOpacity.setValue(0.72 * (1 - k));
              }}
              colors={colors}
              sheetStyle={styles.sheet}
            >
              <Text style={styles.sheetTitle}>{locale === 'en' ? 'Choose date' : 'Выбрать дату'}</Text>
              <WheelPickerColumn
                ref={dateWheelRef}
                active={openPicker === 'date'}
                data={dateOptionLabels}
                valueIndex={pendingDateIdx}
                onChangeIndex={setPendingDateIdx}
                onItemPress={(i) => {
                  const value = dateOptions[Math.max(0, Math.min(dateOptions.length - 1, i))];
                  if (!value) return;
                  const nextDraft = { ...(bookingDraft ?? pickerDraft), dateISO: value };
                  applyDraftAndRespond(
                    nextDraft,
                    'date',
                    formatMoscowCalendarDayLong(value, locale === 'en' ? 'en' : 'ru'),
                  );
                  setOpenPicker(null);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                colors={colors}
              />
              <Pressable
                style={styles.wheelDone}
                onPress={() => {
                  const i = dateWheelRef.current?.getCenterIndex() ?? pendingDateIdx;
                  const value = dateOptions[Math.max(0, Math.min(dateOptions.length - 1, i))];
                  if (value) {
                    const nextDraft = { ...(bookingDraft ?? pickerDraft), dateISO: value };
                    applyDraftAndRespond(
                      nextDraft,
                      'date',
                      formatMoscowCalendarDayLong(value, locale === 'en' ? 'en' : 'ru'),
                    );
                  }
                  setOpenPicker(null);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
              >
                <Text style={styles.wheelDoneText}>{locale === 'en' ? 'Done' : 'Готово'}</Text>
              </Pressable>
            </DraggableWheelSheet>
          </View>
        </Modal>

        <Modal
          visible={openPicker === 'timeMins'}
          animationType="fade"
          transparent
          onRequestClose={() => setOpenPicker(null)}
          presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        >
          <View style={styles.sheetModalRoot}>
            <Animated.View style={[styles.sheetModalSpacer, { opacity: pickerBackdropOpacity }]}>
              <Pressable style={styles.sheetModalBackdropHit} onPress={() => setOpenPicker(null)} />
            </Animated.View>
            <DraggableWheelSheet
              open={openPicker === 'timeMins'}
              onRequestClose={() => setOpenPicker(null)}
              onDragOffsetChange={(offset, max) => {
                const k = max > 1 ? Math.min(1, Math.max(0, offset / max)) : 0;
                pickerBackdropOpacity.setValue(0.72 * (1 - k));
              }}
              colors={colors}
              sheetStyle={styles.sheet}
            >
              <Text style={styles.sheetTitle}>{locale === 'en' ? 'Choose time and duration' : 'Выбрать время и длительность'}</Text>
              <View style={styles.wheelDualLabelsRow}>
                <View style={styles.wheelDualColCity}>
                  <Text style={styles.wheelDualColLabel}>{locale === 'en' ? 'Time' : 'Время'}</Text>
                </View>
                <View style={styles.wheelDualColClub}>
                  <Text style={styles.wheelDualColLabel}>{locale === 'en' ? 'Duration' : 'Длительность'}</Text>
                </View>
              </View>
              <View style={styles.wheelDualRow}>
                <View style={styles.wheelDualColCity}>
                  <WheelPickerColumn
                    ref={timeWheelRef}
                    active={openPicker === 'timeMins'}
                    data={timeOptionLabels}
                    valueIndex={pendingTimeIdx}
                    onChangeIndex={setPendingTimeIdx}
                    colors={colors}
                  />
                </View>
                <View style={styles.wheelDualColClub}>
                  <WheelPickerColumn
                    ref={minsWheelRef}
                    active={openPicker === 'timeMins'}
                    data={minsWheelItems}
                    valueIndex={pendingMinsIdx}
                    onChangeIndex={setPendingMinsIdx}
                    colors={colors}
                  />
                </View>
              </View>
              <Pressable
                style={styles.wheelDone}
                onPress={() => {
                  const ti = timeWheelRef.current?.getCenterIndex() ?? pendingTimeIdx;
                  const mi = minsWheelRef.current?.getCenterIndex() ?? pendingMinsIdx;
                  const timeValue = timeOptions[Math.max(0, Math.min(timeOptions.length - 1, ti))];
                  const minsValue = minsOptions[Math.max(0, Math.min(minsOptions.length - 1, mi))];
                  if (timeValue && minsValue) {
                    const nextDraft = {
                      ...(bookingDraft ?? pickerDraft),
                      hhmm: timeValue,
                      mins: minsValue,
                      durationNeedsConfirm: false,
                    };
                    applyDraftAndRespond(
                      nextDraft,
                      'timeMins',
                      `${formatMoscowWallSlotForLocale(
                        nextDraft.dateISO ?? formatISODateMoscow(new Date()),
                        timeValue,
                        locale === 'en' ? 'en' : 'ru',
                      )}, ${minsValue} ${locale === 'en' ? 'min' : 'мин'}`,
                    );
                  }
                  setOpenPicker(null);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
              >
                <Text style={styles.wheelDoneText}>{locale === 'en' ? 'Done' : 'Готово'}</Text>
              </Pressable>
            </DraggableWheelSheet>
          </View>
        </Modal>

        <Modal
          visible={openPicker === 'pc'}
          animationType="fade"
          transparent
          onRequestClose={() => setOpenPicker(null)}
          presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        >
          <View style={styles.sheetModalRoot}>
            <Animated.View style={[styles.sheetModalSpacer, { opacity: pickerBackdropOpacity }]}>
              <Pressable style={styles.sheetModalBackdropHit} onPress={() => setOpenPicker(null)} />
            </Animated.View>
            <DraggableWheelSheet
              open={openPicker === 'pc'}
              onRequestClose={() => setOpenPicker(null)}
              onDragOffsetChange={(offset, max) => {
                const k = max > 1 ? Math.min(1, Math.max(0, offset / max)) : 0;
                pickerBackdropOpacity.setValue(0.72 * (1 - k));
              }}
              colors={colors}
              sheetStyle={styles.sheet}
            >
              <Text style={styles.sheetTitle}>{locale === 'en' ? 'Choose PC' : 'Выбрать ПК'}</Text>
              <View style={styles.seatViewToggleRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.seatViewToggleBtn,
                    pcPickerViewMode === 'scheme' && styles.seatViewToggleBtnActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setPcPickerViewMode('scheme')}
                >
                  <Text
                    style={[
                      styles.seatViewToggleText,
                      pcPickerViewMode === 'scheme' && styles.seatViewToggleTextActive,
                    ]}
                  >
                    {t('booking.seatViewScheme')}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.seatViewToggleBtn,
                    pcPickerViewMode === 'list' && styles.seatViewToggleBtnActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setPcPickerViewMode('list')}
                >
                  <Text
                    style={[
                      styles.seatViewToggleText,
                      pcPickerViewMode === 'list' && styles.seatViewToggleTextActive,
                    ]}
                  >
                    {t('booking.seatViewList')}
                  </Text>
                </Pressable>
              </View>
              {pcPickerViewMode === 'scheme' ? (
                <View style={styles.pcSchemeWrap}>
                  {pickerStructQ.data?.rooms?.length ? (
                    <>
                      <ClubLayoutCanvas
                        rooms={pickerStructQ.data.rooms}
                        colors={colors}
                        icafeId={pickerCafeId ?? undefined}
                        pcAvailability={pickerPcAvailability}
                        bookingCompact
                        maxViewportHeight={240}
                        onPcPress={(pcName) => {
                          const idx = pcOptions.findIndex((x) => pcNamesLooselyEqual(x, pcName));
                          if (idx >= 0) setPendingPcIdx(idx);
                        }}
                      />
                      <HallMapStatusLegend variant="booking" />
                    </>
                  ) : (
                    <Text style={styles.sheetHintMuted}>
                      {pickerStructQ.isLoading
                        ? locale === 'en'
                          ? 'Loading layout...'
                          : 'Загружаю схему...'
                        : locale === 'en'
                          ? 'Layout is unavailable for this club.'
                          : 'Схема для этого клуба недоступна.'}
                    </Text>
                  )}
                </View>
              ) : (
                <ScrollView style={styles.pcListWrap} contentContainerStyle={styles.pcListWrapInner}>
                  {pcListSections.length ? (
                    pcListSections.map((section) => (
                      <View key={`pc-sec-${section.key}`} style={styles.pcListSection}>
                        <Text style={styles.pcListSectionTitle}>{section.title}</Text>
                        {section.items.map((pc) => {
                          const idx = pcOptions.findIndex((x) => pcNamesLooselyEqual(x, pc.pc_name));
                          if (idx < 0) return null;
                          const selected = idx === pendingPcIdx;
                          const busy = !!pc.is_using;
                          const status = locale === 'en' ? (busy ? 'busy' : 'free') : (busy ? 'занят' : 'свободен');
                          return (
                            <Pressable
                              key={`chat-pc-${section.key}-${pc.pc_name}`}
                              style={[styles.pcListChip, selected && styles.pcListChipActive]}
                              onPress={() => setPendingPcIdx(idx)}
                            >
                              <Text style={[styles.pcListChipText, selected && styles.pcListChipTextActive]}>
                                {formatPublicPcToken(pc.pc_name)}
                              </Text>
                              <Text style={[styles.pcListChipStatus, busy ? styles.pcListChipStatusBusy : styles.pcListChipStatusFree]}>
                                {status}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.sheetHintMuted}>
                      {pickerAvailablePcsQ.isLoading
                        ? locale === 'en'
                          ? 'Loading available PCs...'
                          : 'Загружаю доступные ПК...'
                        : locale === 'en'
                          ? 'No available PCs for selected slot.'
                          : 'Нет доступных ПК на выбранный слот.'}
                    </Text>
                  )}
                </ScrollView>
              )}
              <Pressable
                style={styles.wheelDone}
                onPress={() => {
                  const i = pendingPcIdx;
                  const value = pcOptions[Math.max(0, Math.min(Math.max(0, pcOptions.length - 1), i))];
                  if (value) {
                    const nextDraft = { ...(bookingDraft ?? pickerDraft), pcName: value };
                    applyDraftAndRespond(nextDraft, 'pc', formatPublicPcToken(value));
                  }
                  setOpenPicker(null);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
              >
                <Text style={styles.wheelDoneText}>{locale === 'en' ? 'Done' : 'Готово'}</Text>
              </Pressable>
            </DraggableWheelSheet>
          </View>
        </Modal>
        <Modal
          visible={openPicker === 'editParam'}
          animationType="fade"
          transparent
          onRequestClose={() => setOpenPicker(null)}
          presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        >
          <View style={styles.sheetModalRoot}>
            <Animated.View style={[styles.sheetModalSpacer, { opacity: pickerBackdropOpacity }]}>
              <Pressable style={styles.sheetModalBackdropHit} onPress={() => setOpenPicker(null)} />
            </Animated.View>
            <DraggableWheelSheet
              open={openPicker === 'editParam'}
              onRequestClose={() => setOpenPicker(null)}
              onDragOffsetChange={(offset, max) => {
                const k = max > 1 ? Math.min(1, Math.max(0, offset / max)) : 0;
                pickerBackdropOpacity.setValue(0.72 * (1 - k));
              }}
              colors={colors}
              sheetStyle={styles.sheet}
            >
              <Text style={styles.sheetTitle}>
                {locale === 'en' ? 'Change parameter' : 'Изменить параметр'}
              </Text>
              <WheelPickerColumn
                active={openPicker === 'editParam'}
                data={editParamOptions.map((x) => x.label)}
                valueIndex={pendingEditParamIdx}
                onChangeIndex={setPendingEditParamIdx}
                colors={colors}
              />
              <Pressable
                style={styles.wheelDone}
                onPress={() => {
                  const selected = editParamOptions[
                    Math.max(0, Math.min(editParamOptions.length - 1, pendingEditParamIdx))
                  ];
                  if (selected) {
                    setOpenPicker(selected.key);
                    return;
                  }
                  setOpenPicker(null);
                }}
              >
                <Text style={styles.wheelDoneText}>{locale === 'en' ? 'Continue' : 'Продолжить'}</Text>
              </Pressable>
            </DraggableWheelSheet>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, paddingTop: 4 },
    adminEntryWrap: { paddingHorizontal: 16, paddingBottom: 6, paddingTop: 2 },
    adminEntryBtn: {
      borderRadius: 12,
      backgroundColor: colors.accent,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    adminEntryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    adminTopBarEnd: { fontSize: 13, fontWeight: '700', color: colors.accentBright, paddingVertical: 4, paddingLeft: 8 },
    msgItemSystem: { alignSelf: 'center', maxWidth: '96%', marginBottom: 10 },
    tSystem: { fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center' },
    adminEndedRow: { paddingTop: 4, paddingBottom: 8, paddingHorizontal: 16 },
    adminEndedBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    adminEndedBtnText: { fontSize: 15, fontWeight: '700', color: colors.text },
    listFlex: { flex: 1, minHeight: 120 },
    modeRow: { marginBottom: 6, gap: 6, paddingHorizontal: 16 },
    modeLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
    modeKeyHint: { fontSize: 11, color: colors.muted },
    offlineModeHint: { fontSize: 12, color: colors.muted, marginBottom: 4 },
    suggestionsBlock: {
      marginTop: 18,
      paddingBottom: 4,
      paddingHorizontal: 16,
    },
    popularRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
      marginBottom: 2,
      paddingHorizontal: 16,
    },
    popularChip: {
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    popularChipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    suggestionsToggle: {
      alignSelf: 'flex-start',
      minHeight: 44,
      paddingVertical: 10,
      paddingHorizontal: 0,
      marginTop: 12,
      marginBottom: 4,
      justifyContent: 'center',
    },
    suggestionsToggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accentBright,
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
    list: {
      paddingBottom: 8,
      paddingHorizontal: 16,
      flexGrow: 1,
      justifyContent: 'flex-end',
    },
    msgItem: { marginBottom: 10, maxWidth: '92%' },
    msgItemUser: { alignSelf: 'flex-end' },
    msgItemBot: { alignSelf: 'flex-start' },
    bubble: {
      padding: 12,
      borderRadius: 14,
    },
    bubbleUser: {
      backgroundColor: colors.accent,
      marginRight: 4,
    },
    bubbleBot: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ctaBtn: {
      marginTop: 10,
      borderRadius: 10,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignSelf: 'flex-start',
    },
    ctaBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    actionPanel: {
      marginTop: 10,
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      gap: 6,
    },
    actionPanelTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.muted,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    actionChip: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accentDark,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    quickActionDisabled: { opacity: 0.45 },
    actionChipText: { color: colors.accentTextOnButton, fontSize: 12, fontWeight: '600' },
    feedbackRow: {
      marginTop: 4,
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 4,
    },
    feedbackThanksText: {
      color: colors.success,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
      textAlign: 'left',
      width: '100%',
      marginLeft: 4,
    },
    feedbackBtn: {
      minWidth: 28,
      minHeight: 28,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    feedbackBtnSelected: {
      borderColor: colors.success,
      backgroundColor: `${colors.success}22`,
    },
    feedbackBtnText: { fontSize: 14, lineHeight: 18 },
    sheetModalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    },
    sheetModalSpacer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
    sheetModalBackdropHit: { flex: 1 },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 12,
      gap: 10,
    },
    sheetTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
    sheetHintMuted: { color: colors.muted, fontSize: 13, textAlign: 'center' },
    pressed: { opacity: 0.82 },
    seatViewToggleRow: {
      flexDirection: 'row',
      borderRadius: 12,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      gap: 6,
      marginTop: 2,
    },
    seatViewToggleBtn: {
      flex: 1,
      minHeight: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    seatViewToggleBtnActive: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    seatViewToggleText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
    seatViewToggleTextActive: { color: colors.text },
    pcSchemeWrap: { maxHeight: 320, minHeight: 210, overflow: 'hidden' },
    pcListWrap: { maxHeight: 250, minHeight: 120 },
    pcListWrapInner: { gap: 8, paddingVertical: 4 },
    pcListSection: { gap: 6, marginBottom: 8 },
    pcListSectionTitle: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    pcListChip: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      minHeight: 42,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    pcListChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.card,
    },
    pcListChipText: { color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'left' },
    pcListChipTextActive: { color: colors.accentBright },
    pcListChipStatus: { fontSize: 12, fontWeight: '700' },
    pcListChipStatusBusy: { color: colors.danger },
    pcListChipStatusFree: { color: colors.success },
    wheelDualLabelsRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    wheelDualColCity: { flex: 1.05 },
    wheelDualColClub: { flex: 1.15 },
    wheelDualColLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 4,
    },
    wheelDualRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    wheelDone: {
      alignSelf: 'stretch',
      borderRadius: 14,
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginTop: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelDoneText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
    tUser: { color: '#fff', fontSize: 15, lineHeight: 20 },
    tBot: { color: colors.text, fontSize: 15, lineHeight: 24 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    inputRowCompact: {
      gap: 6,
      paddingHorizontal: 12,
    },
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
    inputCompact: {
      paddingHorizontal: 12,
      fontSize: 15,
    },
    sendBtn: {
      backgroundColor: colors.accent,
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnCompact: {
      width: 40,
      height: 40,
      borderRadius: 10,
    },
    sendBtnDisabled: { opacity: 0.7 },
    sendText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  });
}

type ChatCommand = 'book' | 'cancel' | 'nearest' | null;

type LiveAvailabilityInfo = {
  directReply: string;
  promptContext: string;
};

function normalizeChatText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * «Как / где / сколько / можно ли…» про бронь — ответ из БЗ, не сценарий брони в чате.
 * «Забронь / забронируй / хочу на завтра…» — сценарий брони.
 */
function isInformationalBookingQuery(text: string): boolean {
  const s = normalizeChatText(text);
  const hasQ = /[?؟]/.test(text);

  const isImperativeBook =
    /(^|[\s,.])(забронь|забронируй|забукай)\b/.test(s) || /\bbook\s+it\b/.test(s) || /^book\s+pc\b/.test(s);
  if (isImperativeBook) return false;

  const wantsToAct =
    /\b(хочу|надо|нужн|оформ|записа|reserv|reserve|schedule)\b/.test(s) &&
    /\b(заброн|бронь|бронир|booking|book)\b/.test(s) &&
    !/^как\b/.test(s) &&
    !/^(подскажи|расскажи|скажи|объясни|explain|tell me)\b/.test(s);
  if (wantsToAct) return false;

  if (hasQ) {
    if (/^как(\s+же)?\b/.test(s) && /\b(заброн|бронир|оформ|запис|сдела\w* брон)/.test(s)) return true;
    if (
      /^(как|зачем|почему|что\s+такое|какой)\b/.test(s) &&
      /\b(брон|заброн|оформ\w* брон|схем|мест|пк|pc|клуб|слот)/.test(s)
    ) {
      return true;
    }
    if (
      /^(где|в\s+каком)\b.*\b(заброн|бронь|оформ|запис|резерв)/.test(s) ||
      /^(где|в\s+каком)\b.*\b(брон|booking)\b/.test(s)
    ) {
      return true;
    }
    if (/^можно\s+ли\b.*\b(заброн|бронь|оформ|запис|резерв)/.test(s)) return true;
    if (/\b(сколько|сто(ит|мость|ит\s+примерно)|цена|тариф|price|cost)\b.*\b(заброн|брон|booking)\b/.test(s)) {
      return true;
    }
  }

  if (
    /^как(\s+же)?\b/.test(s) &&
    /\b(заброн|оформ\w* брон|сдела\w* брон|записа(ться|ь)?\s+на|получ(ить|ается) брон)/.test(s)
  ) {
    return true;
  }
  if (
    /^как(\s+же)?\b/.test(s) &&
    /\b(в\s+приложени|в\s+чат|на\s+сайт|через\s+сайт)\b/.test(s) &&
    /\b(брон|заброн|пк|pc)\b/.test(s)
  ) {
    return true;
  }
  if (
    /\b(подскажи|расскажи|скажи|объясни|tell me|explain)\b[\s,]*\bкак\b.*\b(заброн|бронир|оформ\w* брон)/.test(
      s,
    )
  ) {
    return true;
  }
  if (/^how\s+to\s+book\b/.test(s) || /^how\s+(do|can)\s+i\s+book\b/.test(s) || /^what\s+.*\bbook(ing)?\b/.test(s)) {
    return true;
  }
  if (/^where\s+(to\s+)?(book|can\s+i\s+book|do\s+i\s+book)\b/.test(s)) {
    return true;
  }
  if (/^can\s+i\s+book\b/.test(s) || /^is\s+it\s+possible\s+to\s+book\b/.test(s)) {
    return true;
  }
  return false;
}

function detectChatCommand(text: string): ChatCommand {
  const s = normalizeChatText(text);
  const hasBookingWord =
    s.includes('брон') || s.includes('book') || s.includes('booking') || s.includes('бронир');
  const hasCancelWord = s.includes('отмен') || s.includes('cancel');
  const hasNearestWord =
    s.includes('ближ') || s.includes('окно') || s.includes('nearest');
  if (hasCancelWord && hasBookingWord) {
    return 'cancel';
  }
  if (hasNearestWord && hasBookingWord) {
    return 'nearest';
  }
  if (isInformationalBookingQuery(text)) {
    return null;
  }
  if (
    s.includes('заброн') ||
    s.includes('заброниру') ||
    s.includes('брониру') ||
    s.includes('бронь') ||
    s.includes('бронирован') ||
    s.includes('book')
  ) {
    return 'book';
  }
  return null;
}

function isAvailabilityStatusQuery(text: string): boolean {
  const s = normalizeChatText(text);
  if (!s) return false;
  if (/(свободн|доступн|available|free)\s*(пк|pc|мест|seat)/.test(s)) return true;
  if (/есть\s+ли\s+(свободн\w*\s+)?(места|место|пк)/.test(s)) return true;
  if (/(на выбранн\w*\s+врем|for selected time)/.test(s) && /\b(vip|общ(ий|ем)\s+зал)\b/.test(s)) return true;
  if (/\b(vip|общ(ий|ем)\s+зал)\b/.test(s) && /\b(мест|пк|pc|seat)\b/.test(s)) return true;
  return false;
}

async function buildLiveAvailabilityInfo(args: {
  text: string;
  locale: string;
  cafes: CafeItem[];
  draft: BookingDraft | null;
  preferredClubId: number | null;
}): Promise<LiveAvailabilityInfo | null> {
  const { text, locale, cafes, draft, preferredClubId } = args;
  if (!isAvailabilityStatusQuery(text)) return null;

  const isRu = !locale.startsWith('en');
  const parsedDateTime = parseDateTimeFromChat(text);
  const dateISO = parsedDateTime.dateISO ?? draft?.dateISO ?? formatISODateMoscow(new Date());
  const hhmm = parsedDateTime.hhmm ?? draft?.hhmm ?? null;
  const mins = parseDurationMins(text) ?? draft?.mins ?? 60;
  const cafeId = resolveClubFromText(text, cafes) ?? draft?.icafeId ?? preferredClubId ?? null;

  if (cafeId == null || !hhmm) {
    const missingParts: string[] = [];
    if (cafeId == null) missingParts.push(isRu ? 'клуб' : 'club');
    if (!hhmm) missingParts.push(isRu ? 'время' : 'time');
    const missingLabel = missingParts.join(isRu ? ' и ' : ' and ');
    return {
      directReply: isRu
        ? `Чтобы точно проверить свободные места через API, уточните ${missingLabel}.`
        : `To check availability via API, please specify ${missingLabel}.`,
      promptContext: isRu
        ? `Проверка мест через API не выполнена: не хватает данных (${missingLabel}).`
        : `Live API availability check was skipped: missing ${missingLabel}.`,
    };
  }

  const cafe = cafes.find((c) => c.icafe_id === cafeId);
  const clubLabel = formatClubAddressLabelWithCity(cafe);
  const dateHuman = formatMoscowCalendarDayLong(dateISO, isRu ? 'ru' : 'en');
  try {
    const res = await bookingFlowApi.availablePcs({
      cafeId,
      dateStart: dateISO,
      timeStart: hhmm,
      mins,
      isFindWindow: false,
      priceName: '',
    });
    let freeTotal = 0;
    let freeVip = 0;
    let freeCommon = 0;
    for (const pc of res.pc_list ?? []) {
      if (pc.is_using) continue;
      freeTotal += 1;
      if (pcZoneKindFromPc(pc) === 'VIP') freeVip += 1;
      else freeCommon += 1;
    }
    const slotLabel = `${dateHuman}, ${hhmm}, ${mins} ${isRu ? 'мин' : 'min'}`;
    return {
      directReply: isRu
        ? `Проверил по API: на слот ${slotLabel}, клуб ${clubLabel} свободно ${freeTotal} ПК (VIP: ${freeVip}, общий зал: ${freeCommon}).`
        : `API check: for ${slotLabel} at ${clubLabel}, ${freeTotal} PCs are free (VIP: ${freeVip}, common hall: ${freeCommon}).`,
      promptContext: isRu
        ? [
            'Проверка слота через API:',
            `- клуб: ${clubLabel} (id ${cafeId})`,
            `- дата: ${dateISO}`,
            `- время: ${hhmm}`,
            `- длительность: ${mins} мин`,
            `- свободно всего: ${freeTotal}`,
            `- свободно VIP: ${freeVip}`,
            `- свободно общий зал: ${freeCommon}`,
          ].join('\n')
        : [
            'Live availability from API:',
            `- club: ${clubLabel} (id ${cafeId})`,
            `- date: ${dateISO}`,
            `- time: ${hhmm}`,
            `- duration: ${mins} min`,
            `- free total: ${freeTotal}`,
            `- free VIP: ${freeVip}`,
            `- free common hall: ${freeCommon}`,
          ].join('\n'),
    };
  } catch (e) {
    if (__DEV__) console.warn('[chat-live-availability]', e);
    return {
      directReply: isRu
        ? 'Не удалось получить актуальные свободные места из API. Попробуйте еще раз через минуту.'
        : 'Failed to load live availability from API. Please try again in a minute.',
      promptContext: isRu
        ? 'Проверка мест через API завершилась ошибкой.'
        : 'Live API availability check failed.',
    };
  }
}

function flattenMemberRows(data: Record<string, MemberBookingRow[]> | undefined): Array<{
  icafeId: number;
  row: MemberBookingRow;
}> {
  if (!data) return [];
  const out: Array<{ icafeId: number; row: MemberBookingRow }> = [];
  for (const [icafeId, rows] of Object.entries(data)) {
    const n = Number(icafeId);
    if (!Number.isFinite(n) || !Array.isArray(rows)) continue;
    for (const row of rows) out.push({ icafeId: n, row });
  }
  out.sort((a, b) => {
    const ta = intervalFromMemberRow(a.row)?.start.getTime() ?? 0;
    const tb = intervalFromMemberRow(b.row)?.start.getTime() ?? 0;
    return tb - ta;
  });
  return out;
}

/** «в 3 ночи» / «at 3 am» — явно ночь/утро (12-часовая интерпретация). */
function hasNightMorningClockHint(s: string): boolean {
  return /\b(утра|утром|ночи|ночью|полноч|полуноч|по\s+утрам?|часу\s+ночи|часа\s+ночи|час\s+ночи|ночная|ночной|ранним\s+утром|am\b|a\.\s*m\.|midnight|in\s+the\s+morning)\b/u.test(
    s,
  );
}

/**
 * Без «утра/ночи» неоднозначный час (1–11, слово или цифра без ведущего нуля) = днём: «в три» → 15:00.
 * С «утра/ночи» → «в 3 ночи» = 03:00. «в 09:30» / «в 03» (с ведущим нулём) оставляем как задано.
 * Для 12: без ночи — полдень; с ночью — полночь.
 */
function resolveAmbiguousChatHour24(low: string, hourToken: string, numericHour: number): number {
  const h = numericHour;
  if (!Number.isFinite(h) || h < 0 || h > 23) return h;
  if (/^0\d$/u.test(hourToken)) return h;
  if (h >= 13) return h;
  if (h === 0) return 0;
  const night = hasNightMorningClockHint(low);
  if (h === 12) return night ? 0 : 12;
  if (h >= 1 && h <= 11) {
    if (night) return h;
    return h + 12;
  }
  return h;
}

const RU_HOUR_WORD_TO_NUM: Record<string, number> = {
  одиннадцать: 11,
  двенадцать: 12,
  десять: 10,
  девять: 9,
  восемь: 8,
  семь: 7,
  шесть: 6,
  пять: 5,
  четыре: 4,
  три: 3,
  два: 2,
  две: 2,
  один: 1,
  одну: 1,
  одна: 1,
};

function matchRussianHourWordAfterPrep(low: string): { word: string; hour: number } | null {
  const m = low.match(
    /(?:^|\s)(?:в|на|at)\s*(одиннадцать|двенадцать|десять|девять|восемь|семь|шесть|пять|четыре|три|два|две|один|одну|одна)(?=\s|$|[.,!?:;])/u,
  );
  const w = m?.[1]?.toLowerCase();
  if (!w) return null;
  const hour = RU_HOUR_WORD_TO_NUM[w];
  if (hour == null) return null;
  return { word: w, hour };
}

function parseDateTimeFromChatCore(text: string): { dateISO: string | null; hhmm: string | null } {
  const low = normalizeChatText(text);
  // Remove duration fragments so phrases like "на 1 часик" are not mistaken for clock time.
  const lowWithoutDuration = low
    .replace(/\b\d{1,3}\s*(?:мин|минута|минут|минуты|m|min)\w*/gu, ' ')
    .replace(/\b\d(?:[.,]\d)?\s*(?:ч|час|часик|часа|часов|h|hour)\w*/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const timeMatch = low.match(/\b(0\d|1\d|2[0-3]|[3-9])(?:[:.\s])([0-5]\d)\b/u);
  const ruHourWord = !timeMatch ? matchRussianHourWordAfterPrep(lowWithoutDuration) : null;
  const hourOnlyMatch =
    !timeMatch && !ruHourWord
      ? lowWithoutDuration.match(
          /(?:^|\s)(?:в|на|at)\s*([01]?\d|2[0-3])(?!\s*(?:ч|час|hour|мин|min|m)\b)(?=\s|$|[.,!?:;])/u,
        )
      : null;
  const standaloneHourMatch =
    !timeMatch && !ruHourWord && !hourOnlyMatch
      ? lowWithoutDuration.match(/(?:^|\s)([01]?\d|2[0-3])(?=\s|$|[.,!?:;])/u)
      : null;

  let hhmm: string | null = null;
  if (timeMatch) {
    const hourTok = timeMatch[1]!;
    const min = timeMatch[2]!;
    const n = Number(hourTok);
    const h24 = resolveAmbiguousChatHour24(low, hourTok, n);
    hhmm = `${String(h24).padStart(2, '0')}:${min}`;
  } else if (ruHourWord) {
    const h24 = resolveAmbiguousChatHour24(low, ruHourWord.word, ruHourWord.hour);
    hhmm = `${String(h24).padStart(2, '0')}:00`;
  } else if (hourOnlyMatch) {
    const hourTok = hourOnlyMatch[1]!;
    const n = Number(hourTok);
    const h24 = resolveAmbiguousChatHour24(low, hourTok, n);
    hhmm = `${String(h24).padStart(2, '0')}:00`;
  } else if (
    (low.includes('сегодня') || low.includes('today') || low.includes('завтра') || low.includes('tomorrow')) &&
    standaloneHourMatch
  ) {
    const hourTok = standaloneHourMatch[1]!;
    const n = Number(hourTok);
    const h24 = resolveAmbiguousChatHour24(low, hourTok, n);
    hhmm = `${String(h24).padStart(2, '0')}:00`;
  }
  const today = formatISODateMoscow(new Date());
  if (low.includes('сегодня') || low.includes('today')) return { dateISO: today, hhmm };
  if (low.includes('завтра') || low.includes('tomorrow')) return { dateISO: addCalendarDaysMoscow(today, 1), hhmm };
  const dm = low.match(/\b([0-3]?\d)[./]([01]?\d)\b/);
  if (dm) {
    const year = Number(today.slice(0, 4));
    const month = Number(dm[2]);
    const day = Number(dm[1]);
    const thisYearIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { dateISO: thisYearIso, hhmm };
  }
  const iso = low.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return { dateISO: `${iso[1]}-${iso[2]}-${iso[3]}`, hhmm };
  }
  const monthNames: Record<string, number> = {
    january: 1,
    января: 1,
    январь: 1,
    february: 2,
    февраля: 2,
    февраль: 2,
    march: 3,
    марта: 3,
    март: 3,
    april: 4,
    апреля: 4,
    апрель: 4,
    may: 5,
    мая: 5,
    june: 6,
    июня: 6,
    июнь: 6,
    july: 7,
    июля: 7,
    июль: 7,
    august: 8,
    августа: 8,
    август: 8,
    september: 9,
    сентября: 9,
    сентябрь: 9,
    october: 10,
    октября: 10,
    октябрь: 10,
    november: 11,
    ноября: 11,
    ноябрь: 11,
    december: 12,
    декабря: 12,
    декабрь: 12,
  };
  const namedDate = low.match(
    /\b([0-3]?\d)\s+(январ[ья]|феврал[ья]|март[а]?|апрел[ья]|ма[йя]|июн[ья]|июл[ья]|август[а]?|сентябр[ья]|октябр[ья]|ноябр[ья]|декабр[ья]|january|february|march|april|may|june|july|august|september|october|november|december)\b/u,
  );
  if (namedDate) {
    const year = Number(today.slice(0, 4));
    const day = Number(namedDate[1]);
    const monthToken = namedDate[2];
    const month = monthToken ? monthNames[monthToken] : undefined;
    if (month && day >= 1 && day <= 31) {
      return { dateISO: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, hhmm };
    }
  }
  return { dateISO: null, hhmm };
}

/**
 * If the user wrote a wall-clock time but no day ("сегодня", "завтра", 12.04, etc.),
 * assume the booking is for the current calendar day in Moscow. Matches short phrases like
 * «забронь пк в 17 50 на час».
 */
function parseDateTimeFromChat(text: string): { dateISO: string | null; hhmm: string | null } {
  const out = parseDateTimeFromChatCore(text);
  if (out.hhmm && !out.dateISO) {
    return { dateISO: formatISODateMoscow(new Date()), hhmm: out.hhmm };
  }
  return out;
}

function parsePcOverride(text: string): string | null {
  const stopTokens = new Set([
    'на',
    'в',
    'at',
    'today',
    'tomorrow',
    'сегодня',
    'завтра',
  ]);
  const normalizePcToken = (raw: string | undefined): string | null => {
    if (!raw) return null;
    const token = String(raw).trim();
    if (!token) return null;
    if (stopTokens.has(token.toLowerCase())) return null;
    return /^\d+$/.test(token) ? `PC ${token}` : token;
  };
  const candidates: string[] = [];
  for (const m of text.matchAll(/\b(?:пк|pc)\s*([a-z0-9а-яё_-]{1,6})\b/gi)) {
    const n = normalizePcToken(m[1]);
    if (n) candidates.push(n);
  }
  for (const m of text.matchAll(
    /(?:^|[\s,])([0-9]{1,3}|[a-z0-9а-яё]{1,4})\s*(?:пк|pc)(?:$|[\s,!.?])/gi,
  )) {
    const n = normalizePcToken(m[1]);
    if (n) candidates.push(n);
  }
  if (!candidates.length) return null;
  return candidates[candidates.length - 1] ?? null;
}

/** Пользователь явно называет место/ПК — нельзя подставлять «первый свободный» из API. */
function userMentionsExplicitPc(text: string): boolean {
  const low = normalizeChatText(text);
  return /(?:\d{1,3}|[a-z0-9]{1,3})\s*(?:пк|pc)(?:$|[\s,!.?])|(?:\b)(?:пк|pc)\s*(?:[0-9]{1,3}|[a-z0-9]{1,4})/i.test(
    low,
  );
}

function mergeBookingLlmIntoDraft(
  draft: BookingDraft,
  ex: BookingLlmExtraction,
  cafes: CafeItem[],
  _preferredClubId: number | null,
): BookingDraft {
  let d = { ...draft };
  if (ex.dateISO?.trim()) d.dateISO = ex.dateISO.trim();
  if (ex.hhmm?.trim()) d.hhmm = ex.hhmm.trim();
  if (ex.duration_mins != null && Number.isFinite(ex.duration_mins) && ex.duration_mins > 0) {
    d.mins = Math.round(ex.duration_mins);
    d.durationNeedsConfirm = false;
  }
  if (ex.pc_seat?.trim()) {
    const s = ex.pc_seat.trim();
    d.pcName = /^\d{1,3}$/.test(s) ? `PC ${s}` : s;
  }
  if (ex.club_hint?.trim()) {
    const id = resolveClubFromText(ex.club_hint, cafes) ?? null;
    if (id) d.icafeId = id;
  }
  return d;
}

function bookingLlmHasAnyField(ex: BookingLlmExtraction | null | undefined): boolean {
  if (!ex) return false;
  return Boolean(
    ex.dateISO?.trim() ||
      ex.hhmm?.trim() ||
      (ex.duration_mins != null && ex.duration_mins > 0) ||
      ex.pc_seat?.trim() ||
      ex.club_hint?.trim(),
  );
}

function parseDurationMins(text: string): number | null {
  const low = normalizeChatText(text);
  const mins = low.match(/\b(\d{2,3})\s*(?:мин|m|min)\b/);
  if (mins) return Math.max(30, Math.min(600, Number(mins[1])));
  const h = low.match(/\b(\d(?:[.,]\d)?)\s*(?:ч|час|часик|часа|часов|h|hour)\w*/u);
  if (h) {
    const n = Number(String(h[1]).replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return Math.max(30, Math.min(600, Math.round(n * 60)));
  }
  return null;
}

function formatClubAddressLabel(cafe: Pick<CafeItem, 'address' | 'name' | 'icafe_id'> | undefined): string {
  if (!cafe) return '-';
  const raw = String(cafe.address || cafe.name || cafe.icafe_id).trim();
  if (!raw) return String(cafe.icafe_id);
  const cityPrefixSet = new Set<string>();
  for (const city of BB_CITIES) {
    cityPrefixSet.add(city.nameRu.toLowerCase());
    cityPrefixSet.add(city.nameEn.toLowerCase());
  }
  const parts = raw.split(',');
  if (parts.length < 2) return raw;
  const firstPart = parts[0]?.trim().toLowerCase() ?? '';
  if (!cityPrefixSet.has(firstPart)) return raw;
  const withoutCity = parts.slice(1).join(',').trim();
  return withoutCity || raw;
}

function formatClubAddressLabelWithCity(cafe: Pick<CafeItem, 'address' | 'name' | 'icafe_id'> | undefined): string {
  if (!cafe) return '-';
  const raw = String(cafe.address || cafe.name || cafe.icafe_id).trim();
  if (!raw) return String(cafe.icafe_id);
  return raw;
}

function userQueryMentionsClubField(userLow: string, field: string): boolean {
  const f = String(field)
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .trim();
  if (f.length < 3) return false;
  if (userLow.includes(f)) return true;
  // Street/city words in different cases: «Медвежья» vs «на Медвежьей»
  const parts = f.split(/[\s,./]+/u).filter((p) => p.length >= 4);
  for (const p of parts) {
    const head = p.length > 6 ? p.slice(0, 6) : p;
    if (head.length >= 4 && userLow.includes(head)) return true;
  }
  return false;
}

function resolveClubFromText(text: string, cafes: CafeItem[]): number | null {
  const low = normalizeChatText(text);
  for (const c of cafes) {
    const name = String(c.name ?? '').trim().toLowerCase();
    const address = String(c.address ?? '').trim().toLowerCase();
    if (name && low.includes(name)) return c.icafe_id;
    if (address && low.includes(address)) return c.icafe_id;
    if (name && userQueryMentionsClubField(low, name)) return c.icafe_id;
    if (address && userQueryMentionsClubField(low, address)) return c.icafe_id;
  }
  return null;
}

function singleClubId(cafes: CafeItem[]): number | null {
  return cafes.length === 1 ? cafes[0]?.icafe_id ?? null : null;
}

function clubChoiceHint(cafes: CafeItem[], locale: string): string {
  const isRu = locale !== 'en';
  if (cafes.length <= 1) return '';
  const variants = cafes
    .slice(0, 4)
    .map((c) => formatClubAddressLabelWithCity(c))
    .filter(Boolean);
  if (!variants.length) return '';
  const more = cafes.length > variants.length ? (isRu ? '; и другие в списке ниже.' : '; and more in the list below.') : '.';
  return isRu
    ? `\nВарианты: ${variants.join('; ')}${more}`
    : `\nOptions: ${variants.join('; ')}${more}`;
}

function hasConfirmIntent(text: string): boolean {
  const s = normalizeChatText(text);
  return (
    s.includes('подтверд') ||
    s === 'да' ||
    s === 'ок' ||
    s.includes('давай') ||
    s.includes('confirm') ||
    s.includes('book now')
  );
}

function hasChangeIntent(text: string, what: 'date' | 'time' | 'mins' | 'pc' | 'club'): boolean {
  const s = normalizeChatText(text);
  const hasChange = s.includes('измен') || s.includes('смен') || s.includes('change');
  if (!hasChange) return false;
  if (what === 'date') return s.includes('дат');
  if (what === 'time') return s.includes('врем') || s.includes('час');
  if (what === 'mins') return s.includes('длител') || s.includes('мин') || s.includes('час');
  if (what === 'pc') return s.includes('пк') || s.includes('pc') || s.includes('мест');
  return s.includes('клуб') || s.includes('адрес');
}

function isBookingDraftContinuationInput(text: string, cafes: CafeItem[]): boolean {
  const s = normalizeChatText(text);
  if (!s) return false;
  if (isInformationalBookingQuery(text)) return false;

  const command = detectChatCommand(text);
  if (command === 'book') return true;
  if (hasConfirmIntent(text)) return true;
  if (hasChangeIntent(text, 'club')) return true;
  if (hasChangeIntent(text, 'date')) return true;
  if (hasChangeIntent(text, 'time')) return true;
  if (hasChangeIntent(text, 'mins')) return true;
  if (hasChangeIntent(text, 'pc')) return true;

  const dt = parseDateTimeFromChat(text);
  if (dt.dateISO || dt.hhmm) return true;
  if (parseDurationMins(text) != null) return true;
  if (parsePcOverride(text)) return true;
  if (resolveClubFromText(text, cafes) != null) return true;

  const bookingStepKeywords = [
    'клуб',
    'дата',
    'время',
    'длител',
    'пк',
    'место',
    'бронь',
    'booking',
    'club',
    'date',
    'time',
    'duration',
    'seat',
  ];
  return bookingStepKeywords.some((kw) => s.includes(kw));
}

function bookingDraftMissing(draft: BookingDraft): Array<'club' | 'date' | 'time' | 'mins' | 'pc'> {
  const out: Array<'club' | 'date' | 'time' | 'mins' | 'pc'> = [];
  if (!draft.icafeId) out.push('club');
  if (!draft.dateISO) out.push('date');
  if (!draft.hhmm) out.push('time');
  if (!draft.mins || !!draft.durationNeedsConfirm) out.push('mins');
  if (!draft.pcName) out.push('pc');
  return out;
}

function ctaForDraft(draft: BookingDraft, t: Translate): ChatCta | undefined {
  if (!draft.icafeId) return undefined;
  return {
    label: t('chat.ctaOpenBooking'),
    prefill: {
      icafeId: draft.icafeId,
      pcName: draft.pcName ?? undefined,
      mins: draft.mins ?? undefined,
      dateISO: draft.dateISO ?? undefined,
      timeHHmm: draft.hhmm ?? undefined,
    },
  };
}

function bookingReadySummary(draft: BookingDraft, locale: string): string {
  const isRu = locale !== 'en';
  const pc = formatPublicPcToken(draft.pcName ?? '');
  const dateHuman = formatChatDateHuman(draft.dateISO, locale);
  const timeHuman = formatChatTimeHuman(draft.dateISO, draft.hhmm, locale);
  if (isRu) {
    return `Все готово: ${dateHuman} ${timeHuman}, ${draft.mins} мин, ПК ${pc}. Хотите что-то поменять или подтверждаем бронь?`;
  }
  return `Ready: ${dateHuman} ${timeHuman}, ${draft.mins} min, PC ${pc}. Do you want to change anything or confirm booking?`;
}

function formatChatDateHuman(dateISO: string | null, locale: string): string {
  if (!dateISO) return '-';
  const [y, mo, d] = dateISO.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return dateISO;
  const instant = moscowWallTimeToUtc(y, mo, d, 12, 0, 0);
  return instant.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Moscow',
  });
}

function formatChatTimeHuman(dateISO: string | null, hhmm: string | null, locale: string): string {
  if (!hhmm) return '-';
  if (!dateISO) return hhmm;
  return formatMoscowWallSlotForLocale(dateISO, hhmm, locale === 'en' ? 'en' : 'ru');
}

function bookingActionsTitle(draft: BookingDraft, locale: string): string {
  const isRu = locale !== 'en';
  const missing = bookingDraftMissing(draft);
  const current = missing[0];
  if (!current) return isRu ? 'Изменить параметры' : 'Edit parameters';
  if (current === 'club') return isRu ? 'Выбрать клуб' : 'Choose club';
  if (current === 'date') return isRu ? 'Выбрать дату' : 'Choose date';
  if (current === 'time' || current === 'mins') return isRu ? 'Выбрать время и длительность' : 'Choose time & duration';
  return isRu ? 'Выбрать ПК' : 'Choose PC';
}

async function createBookingFromDraft(args: {
  draft: BookingDraft;
  user: { memberAccount: string; memberId: string; privateKey?: string } | null;
  t: Translate;
  locale: string;
}): Promise<string> {
  const { draft, user, t, locale } = args;
  const isRu = locale !== 'en';
  const acc = user?.memberAccount?.trim();
  const mid = user?.memberId?.trim();
  if (!acc || !mid) return t('booking.warnNoMemberId');
  if (!draft.icafeId || !draft.dateISO || !draft.hhmm || !draft.mins || !draft.pcName) {
    return isRu ? 'Не хватает данных для брони.' : 'Missing required booking data.';
  }
  await bookingFlowApi.createBooking({
    icafe_id: draft.icafeId,
    pc_name: draft.pcName,
    member_account: acc,
    member_id: mid,
    start_date: draft.dateISO,
    start_time: `${draft.hhmm}:00`,
    mins: draft.mins,
    private_key: user?.privateKey?.trim(),
  });
  const pcHuman = formatPublicPcToken(draft.pcName);
  const dateHuman = formatChatDateHuman(draft.dateISO, locale);
  const timeHuman = formatChatTimeHuman(draft.dateISO, draft.hhmm, locale);
  return isRu
    ? `Готово! Забронировал место ${pcHuman} на ${dateHuman} в ${timeHuman}.`
    : `Done! Booked seat ${pcHuman} on ${dateHuman} at ${timeHuman}.`;
}

async function autofillDraftPcIfPossible(
  draft: BookingDraft,
  userSourceText = '',
): Promise<BookingDraft> {
  if (draft.pcName?.trim()) return draft;
  if (userMentionsExplicitPc(userSourceText) && !parsePcOverride(userSourceText)) {
    return draft;
  }
  if (!draft.icafeId || !draft.dateISO || !draft.hhmm || !draft.mins) return draft;
  try {
    const res = await bookingFlowApi.availablePcs({
      cafeId: draft.icafeId,
      dateStart: draft.dateISO,
      timeStart: draft.hhmm,
      mins: draft.mins,
      isFindWindow: false,
    });
    const firstFree = (res.pc_list ?? [])
      .find((pc) => !pc.is_using && String(pc.pc_name || '').trim())
      ?.pc_name?.trim();
    if (!firstFree) return draft;
    return { ...draft, pcName: firstFree };
  } catch {
    return draft;
  }
}

async function handleBookByChat(args: {
  text: string;
  rows: Array<{ icafeId: number; row: MemberBookingRow }>;
  cafes: CafeItem[];
  preferredClubId: number | null;
  user: { memberAccount: string; memberId: string; privateKey?: string } | null;
  t: Translate;
  locale: string;
  setDraft: React.Dispatch<React.SetStateAction<BookingDraft | null>>;
  /** Разбор Ollama — поля важнее эвристик парсера. */
  llmExtraction?: BookingLlmExtraction | null;
}): Promise<{ text: string; cta?: ChatCta; actions?: ChatAction[]; actionsTitle?: string; didBook: boolean }> {
  const { text, rows, cafes, preferredClubId, user, t, locale, setDraft, llmExtraction } = args;
  const isRu = locale !== 'en';
  const template = rows.find((x) => {
    const state = bookingRowLifecycleStatus(x.row);
    return state === 'active' || state === 'upcoming' || state === 'ended';
  });
  const parsed = parseDateTimeFromChat(text);
  const low = normalizeChatText(text);
  const useUsual = low.includes('как обычно') || low.includes('as usual');
  const parsedDuration = parseDurationMins(text);
  const templateMins = template?.row.product_mins ? Number(template.row.product_mins) : null;
  let draft: BookingDraft = {
    icafeId: resolveClubFromText(text, cafes) ?? preferredClubId ?? template?.icafeId ?? singleClubId(cafes) ?? null,
    pcName: parsePcOverride(text) ?? (useUsual ? null : template ? String(template.row.product_pc_name || '').trim() : null),
    mins: parsedDuration ?? templateMins ?? 60,
    dateISO: parsed.dateISO,
    hhmm: parsed.hhmm,
    durationNeedsConfirm: useUsual && !parsedDuration,
  };
  if (bookingLlmHasAnyField(llmExtraction)) {
    draft = mergeBookingLlmIntoDraft(draft, llmExtraction!, cafes, preferredClubId);
  }
  draft = await autofillDraftPcIfPossible(draft, text);
  const missing = bookingDraftMissing(draft);

  if (!missing.length) {
    setDraft(draft);
    return {
      text: bookingReadySummary(draft, locale),
      cta: ctaForDraft(draft, t),
      actions: bookingDraftActions(draft, locale, cafes, preferredClubId),
      actionsTitle: bookingActionsTitle(draft, locale),
      didBook: false,
    };
  }

  setDraft(draft);
  const need = missing[0];
  const clubLine =
    draft.icafeId != null
      ? `${isRu ? 'Клуб' : 'Club'}: ${formatClubAddressLabelWithCity(cafes.find((c) => c.icafe_id === draft.icafeId))}\n`
      : '';
  const ask =
    need === 'club'
      ? isRu
        ? `В какой клуб забронировать? Напишите адрес или название клуба.${clubChoiceHint(cafes, locale)}`
        : `Which club should I use? Send club name or address.${clubChoiceHint(cafes, locale)}`
      : need === 'date'
        ? isRu
          ? `${clubLine}Выберите дату:`
          : `${clubLine}Choose date:`
        : need === 'time' || need === 'mins'
          ? isRu
            ? 'Выберите время и длительность кнопкой ниже или напишите, например: 19:30 на 90 мин.'
            : 'Choose time and duration below, or type: 19:30 for 90 min.'
            : isRu
              ? 'Выберите ПК: открыть схему или список. Либо напишите вручную, например "ПК 12".'
              : 'Choose PC via scheme or list, or type manually, e.g. "PC 12".';
  return {
    text: ask,
    cta: ctaForDraft(draft, t),
    actions: bookingDraftActions(draft, locale, cafes, preferredClubId),
    actionsTitle: bookingActionsTitle(draft, locale),
    didBook: false,
  };
}

async function handleBookingDraftStep(args: {
  text: string;
  draft: BookingDraft;
  setDraft: React.Dispatch<React.SetStateAction<BookingDraft | null>>;
  user: { memberAccount: string; memberId: string; privateKey?: string } | null;
  rows: Array<{ icafeId: number; row: MemberBookingRow }>;
  cafes: CafeItem[];
  preferredClubId: number | null;
  t: Translate;
  locale: string;
  llmExtraction?: BookingLlmExtraction | null;
}): Promise<{ text: string; cta?: ChatCta; actions?: ChatAction[]; actionsTitle?: string }> {
  const { text, draft, setDraft, user, rows, cafes, preferredClubId, t, locale, llmExtraction } = args;
  const isRu = locale !== 'en';
  const parsedDateTime = parseDateTimeFromChat(text);
  const parsedDuration = parseDurationMins(text);
  let next: BookingDraft = {
    icafeId: resolveClubFromText(text, cafes) ?? draft.icafeId ?? preferredClubId ?? rows[0]?.icafeId ?? singleClubId(cafes) ?? null,
    pcName: parsePcOverride(text) ?? draft.pcName,
    mins: parsedDuration ?? draft.mins ?? (rows[0]?.row.product_mins ? Number(rows[0].row.product_mins) : 60),
    dateISO: parsedDateTime.dateISO ?? draft.dateISO,
    hhmm: parsedDateTime.hhmm ?? draft.hhmm,
    durationNeedsConfirm: parsedDuration ? false : draft.durationNeedsConfirm ?? false,
  };
  if (hasChangeIntent(text, 'club')) next = { ...next, icafeId: null };
  if (hasChangeIntent(text, 'date')) next = { ...next, dateISO: null };
  if (hasChangeIntent(text, 'time')) next = { ...next, hhmm: null };
  if (hasChangeIntent(text, 'mins')) next = { ...next, mins: null, durationNeedsConfirm: true };
  if (hasChangeIntent(text, 'pc')) next = { ...next, pcName: null };
  if (bookingLlmHasAnyField(llmExtraction)) {
    next = mergeBookingLlmIntoDraft(next, llmExtraction!, cafes, preferredClubId);
  }
  if (!hasChangeIntent(text, 'pc')) {
    next = await autofillDraftPcIfPossible(next, text);
  }

  const missing = bookingDraftMissing(next);
  const clubLine =
    next.icafeId != null
      ? `${isRu ? 'Клуб' : 'Club'}: ${formatClubAddressLabelWithCity(cafes.find((c) => c.icafe_id === next.icafeId))}\n`
      : '';
  if (!missing.length && hasConfirmIntent(text)) {
    const done = await createBookingFromDraft({ draft: next, user, t, locale });
    setDraft(null);
    return { text: done };
  }

  setDraft(next);
  if (!missing.length) {
    const summary = bookingReadySummary(next, locale);
    return {
      text: summary,
      cta: ctaForDraft(next, t),
      actions: bookingDraftActions(next, locale, cafes, preferredClubId),
      actionsTitle: bookingActionsTitle(next, locale),
    };
  }
  const need = missing[0];
  const ask =
    need === 'club'
      ? isRu
        ? `Нужен клуб: напишите название или адрес.${clubChoiceHint(cafes, locale)}`
        : `Need a club: send name or address.${clubChoiceHint(cafes, locale)}`
      : need === 'date'
        ? isRu
          ? `${clubLine}Выберите дату:`
          : `${clubLine}Choose date:`
        : need === 'time' || need === 'mins'
          ? isRu
            ? 'Нужно выбрать время и длительность: нажмите кнопку ниже или напишите, например: 19:30 на 90 мин.'
            : 'Need time and duration: tap the button below or type 19:30 for 90 min.'
          : isRu
            ? 'Нужно выбрать ПК: схема или список. Можно и текстом, например "ПК 12".'
            : 'Need PC: pick scheme or list, or type "PC 12".';
  return {
    text: ask,
    cta: ctaForDraft(next, t),
    actions: bookingDraftActions(next, locale, cafes, preferredClubId),
    actionsTitle: bookingActionsTitle(next, locale),
  };
}

async function handleNearestByChat(args: {
  text: string;
  rows: Array<{ icafeId: number; row: MemberBookingRow }>;
  cafes: CafeItem[];
  preferredClubId: number | null;
  locale: string;
  t: Translate;
}): Promise<{ text: string; cta?: ChatCta; actions?: ChatAction[]; actionsTitle?: string }> {
  const { text, rows, cafes, preferredClubId, locale, t } = args;
  const isRu = locale !== 'en';
  const dt = parseDateTimeFromChat(text);
  const mins = parseDurationMins(text) ?? (rows[0]?.row.product_mins ? Number(rows[0].row.product_mins) : 60);
  const bookingNowMs = nowForBookingCompareMs();
  const nowMoscow = formatInstantInMoscow(new Date(bookingNowMs));
  const baseDate = dt.dateISO ?? nowMoscow.date;
  const baseTime =
    dt.hhmm ??
    (baseDate === nowMoscow.date
      ? nowMoscow.time.slice(0, 5)
      : '00:00');
  const requestedStartMs =
    combineServerISODateAndTime(baseDate, `${baseTime}:00`)?.getTime() ?? bookingNowMs;
  const minAllowedStartMs = Math.max(bookingNowMs - 90_000, requestedStartMs);
  const clubId = resolveClubFromText(text, cafes) ?? preferredClubId ?? rows[0]?.icafeId ?? null;
  const targetCafes = clubId ? cafes.filter((c) => c.icafe_id === clubId) : cafes;
  if (!targetCafes.length) {
    return {
      text: isRu
        ? 'Не нашел клуб для поиска ближайшей брони. Напишите клуб или откройте бронь по кнопке.'
        : 'I could not resolve a club for nearest booking search.',
    };
  }
  const candidates = await findNearestAcrossClubs(targetCafes, {
    dateStart: baseDate,
    timeStart: baseTime,
    mins,
  });
  const best = candidates.find((c) => c.windowStart.getTime() >= minAllowedStartMs);
  if (!best) {
    return {
      text: isRu
        ? 'Ближайшее окно не нашлось. Попробуйте другую длительность или время.'
        : 'No nearest slot found. Try another duration or time.',
      cta: {
        label: t('chat.ctaOpenNearest'),
        prefill: {
          icafeId: clubId ?? targetCafes[0]!.icafe_id,
          mins,
          dateISO: baseDate,
          timeHHmm: baseTime,
          openNearestSearch: true,
        },
      },
      actions: [
        {
          label: isRu ? 'Открыть во вкладке бронь' : 'Open in Booking tab',
          openBooking: true,
          prefill: {
            icafeId: clubId ?? targetCafes[0]!.icafe_id,
            mins,
            dateISO: baseDate,
            timeHHmm: baseTime,
          },
        },
        { label: isRu ? 'Изменить параметр' : 'Change parameter', openFilter: 'editParam' },
      ],
      actionsTitle: isRu ? 'Варианты' : 'Options',
    };
  }
  const bestDate = formatISODateMoscow(best.windowStart);
  const wall = formatInstantInMoscow(best.windowStart);
  const slotTime = formatMoscowWallSlotForLocale(bestDate, wall.time.slice(0, 5), locale === 'en' ? 'en' : 'ru');
  const when = `${formatMoscowCalendarDayLong(bestDate, locale === 'en' ? 'en' : 'ru')} ${slotTime}`;
  return {
    text: isRu
      ? `Нашел ближайшее окно: ${when}, клуб ${best.cafe.address}. Можете продолжить в чате или открыть экран брони.`
      : `Nearest slot found: ${when}, club ${best.cafe.address}. Continue here or open Booking.`,
    cta: {
      label: t('chat.ctaOpenNearest'),
      prefill: {
        icafeId: best.cafe.icafe_id,
        mins,
        dateISO: bestDate,
        timeHHmm: wall.time.slice(0, 5),
        openNearestSearch: true,
      },
    },
    actions: [
      {
        label: isRu ? 'Открыть во вкладке бронь' : 'Open in Booking tab',
        openBooking: true,
        prefill: {
          icafeId: best.cafe.icafe_id,
          mins,
          dateISO: bestDate,
          timeHHmm: wall.time.slice(0, 5),
          openNearestSearch: true,
        },
      },
      { label: isRu ? 'Изменить параметр' : 'Change parameter', openFilter: 'editParam' },
    ],
    actionsTitle: isRu ? 'Варианты' : 'Options',
  };
}

function bookingDraftActions(
  draft: BookingDraft,
  locale: string,
  cafes: CafeItem[],
  preferredClubId: number | null,
): ChatAction[] {
  const isRu = locale !== 'en';
  const actions: ChatAction[] = [];
  const missing = bookingDraftMissing(draft);
  const current = missing[0];
  const draftPrefillBase = draft.icafeId
    ? {
        icafeId: draft.icafeId,
        pcName: draft.pcName ?? undefined,
        mins: draft.mins ?? undefined,
        dateISO: draft.dateISO ?? undefined,
        timeHHmm: draft.hhmm ?? undefined,
      }
    : undefined;
  if (current) {
    if (current === 'pc' && draftPrefillBase) {
      actions.push({
        label: isRu ? 'Выбор ПК (схема/список)' : 'Choose PC (scheme/list)',
        openFilter: 'pc',
      });
      actions.push({ label: isRu ? 'Изменить параметр' : 'Change parameter', openFilter: 'editParam' });
      return actions;
    }
    const title =
      current === 'club'
        ? isRu ? 'Выбрать клуб' : 'Choose club'
        : current === 'date'
          ? isRu ? 'Выбрать дату' : 'Choose date'
          : current === 'time'
            ? isRu ? 'Выбрать время и длительность' : 'Choose time & duration'
            : current === 'mins'
              ? isRu ? 'Выбрать время и длительность' : 'Choose time & duration'
              : isRu ? 'Выбрать ПК' : 'Choose PC';
    actions.push({
      label: title,
      openFilter: current === 'time' || current === 'mins' ? 'timeMins' : current,
    });
    actions.push({ label: isRu ? 'Изменить параметр' : 'Change parameter', openFilter: 'editParam' });
  } else {
    actions.push({ label: isRu ? 'Подтвердить' : 'Confirm', sendText: isRu ? 'подтвердить' : 'confirm' });
    actions.push({ label: isRu ? 'Изменить параметр' : 'Change parameter', openFilter: 'editParam' });
  }
  if (cafes.length === 0 && preferredClubId == null) return actions;
  return actions.slice(0, 6);
}

const SMALLTALK_ID_PREFIX = 'smalltalk-';

type HelpNavToken = ChatNavTarget | 'bookingTab';

const KNOWLEDGE_ENTRY_NAV: Record<string, readonly HelpNavToken[]> = {
  'payment-balance': ['profileTopUp', 'balanceHistory'],
  'payment-refund-balance': ['profileTopUp'],
  'payment-tariffs-where': ['bookingTab'],
  'payment-rates-timeofday': ['bookingTab'],
  'payment-member-id': ['profileHome'],
  'booking-how': ['bookingTab'],
  'booking-tariff-pick': ['bookingTab'],
  'booking-free-seats-zones': ['bookingTab'],
  'booking-how-contact': ['bookingTab', 'cafes'],
  'booking-chat-one-message': ['bookingTab'],
  'booking-phone-prepay': ['cafes'],
  'booking-cancel': ['bookingTab'],
  'booking-extend-session': ['bookingTab', 'profileTopUp'],
  'booking-walkin': ['cafes', 'bookingTab'],
  'club-locations': ['cafes', 'bookingTab'],
  'club-hours': ['cafes'],
  'club-wifi': ['cafes'],
  'club-food': ['food'],
  'club-food-drinks-bar': ['food'],
  'club-parking': ['cafes'],
  'club-age': ['cafes'],
  'club-documents': ['cafes'],
  'club-rules': ['cafes'],
  'club-staff-check-game': ['food', 'profileHome'],
  'account-register': ['profileHome'],
  'account-sms': ['profileHome'],
  'account-password': ['profileHome'],
  'account-icafe': ['profileHome'],
  'support-where': ['cafes', 'news'],
  'support-app-error': ['settings'],
  'support-lag-ping': ['cafes'],
  'equipment-pc-specs': ['cafes'],
  'equipment-games-installed-list': ['cafes'],
  'equipment-bring-peripherals': ['cafes'],
  'equipment-steam-epic-login': ['cafes'],
  'equipment-headphones': ['cafes'],
  'equipment-games': ['cafes'],
  'club-call-admin': ['cafes'],
};

const CATEGORY_DEFAULT_NAV: Record<KnowledgeCategory, readonly HelpNavToken[] | null> = {
  booking: ['bookingTab'],
  payment: ['profileTopUp', 'bookingTab'],
  account: ['profileHome'],
  club: ['cafes'],
  equipment: ['cafes'],
  support: null,
};

const NAV_ORDER: readonly HelpNavToken[] = [
  'profileTopUp',
  'balanceHistory',
  'profileDice',
  'bookingTab',
  'food',
  'cafes',
  'profileHome',
  'settings',
  'news',
];

function helpTokenToAction(token: HelpNavToken, t: Translate): ChatAction {
  if (token === 'bookingTab') {
    return { label: t('chat.btnBookingTab'), openBooking: true };
  }
  const nav = token;
  const labelKey: Record<ChatNavTarget, MessageKey> = {
    profileTopUp: 'chat.btnTopUp',
    balanceHistory: 'chat.btnBalanceHistory',
    profileDice: 'chat.btnDice',
    profileHome: 'chat.btnProfile',
    settings: 'chat.btnSettings',
    food: 'chat.btnFood',
    cafes: 'chat.btnCafes',
    news: 'chat.btnNews',
  };
  return { label: t(labelKey[nav]), navigate: nav };
}

/**
 * Кнопки «куда перейти» для ответов из базы / нейросети: по id карточки, категории и эвристикам по запросу.
 */
function helpContextActions(args: {
  userQuery: string;
  knowledgeEntryId: string | null;
  knowledgeCategory: KnowledgeCategory | null;
  t: Translate;
}): { actions: ChatAction[]; actionsTitle?: string } | null {
  const { userQuery, knowledgeEntryId: id, knowledgeCategory: category, t } = args;
  const add = new Set<HelpNavToken>();

  const isSmalltalk = id?.startsWith(SMALLTALK_ID_PREFIX) === true;
  if (!isSmalltalk && id && KNOWLEDGE_ENTRY_NAV[id]) {
    for (const k of KNOWLEDGE_ENTRY_NAV[id]!) {
      add.add(k);
    }
  } else if (!isSmalltalk && id && category) {
    const fallback = CATEGORY_DEFAULT_NAV[category];
    if (fallback) {
      for (const k of fallback) {
        add.add(k);
      }
    }
  }

  if (/(пополн|закин|внести\s+на|внести\s+ден|top\s*up|topup|add\s+to\s+balance|депозит|add\s+funds|replenish)/i.test(
    userQuery,
  )) {
    add.add('profileTopUp');
  }
  if (
    /(истори|движен|транзакц|списан|зачисл|history|transactions|balance\s*history|statement)/i.test(userQuery) &&
    /(баланс|сч[её]т|balance|account)/i.test(userQuery)
  ) {
    add.add('balanceHistory');
  }
  if (
    /(заброн|бронь|бронир|свободн.*мест|свободн.*пк|слот|booking|резерв|оформит.*брон|nearest\s*slot|book\s+a)/i.test(
      userQuery,
    )
  ) {
    add.add('bookingTab');
  }
  if (/(почас|тариф|цена|стоит|пакет|прайс|сколько|rate|pricing|how\s*much|tariff|night\s*pack|₽|руб)/i.test(userQuery)) {
    add.add('bookingTab');
  }
  if (
    /(где.*клуб|адрес|адреса|ближайш.*клуб|как доехать|как\s+добраться|расположен|филиал|точк|клуб\s+на|club\s*loc|nearest\s*club|map)/i.test(
      userQuery,
    )
  ) {
    add.add('cafes');
  }
  if (/(еда|бар|напит|меню|заказ|бургер|кухн|кофе|чай|энергет|перекус|food|drink|snack|kitchen)/i.test(userQuery)) {
    add.add('food');
  }
  if (/(куб|кубик|dice|брос|ролл|мини-игр|mini-?game|dicegame)/i.test(userQuery)) {
    add.add('profileDice');
  }
  if (/(настрой|язык|тем|уведомл|appearance|settings|remind)/i.test(userQuery)) {
    add.add('settings');
  }
  if (/(новост|news|лент)/i.test(userQuery)) {
    add.add('news');
  }
  if (/(профил|аккаунт|мой\s+id|member|личн.*каб|profile|my\s+account|sign\s*in|вход)/i.test(userQuery)) {
    add.add('profileHome');
  }

  if (add.size === 0) return null;

  const actions: ChatAction[] = [];
  for (const token of NAV_ORDER) {
    if (!add.has(token)) continue;
    actions.push(helpTokenToAction(token, t));
    if (actions.length >= 3) break;
  }

  if (actions.length === 0) return null;
  return { actions };
}

async function handleCancelByChat(args: {
  rows: Array<{ icafeId: number; row: MemberBookingRow }>;
  cancel: (params: { icafeId: number; pcName: string; memberOfferId: number }) => Promise<unknown>;
  t: Translate;
  locale: string;
}): Promise<string> {
  const { rows, cancel, t, locale } = args;
  const isRu = locale !== 'en';
  const upcoming = rows
    .map((x) => ({ ...x, state: bookingRowLifecycleStatus(x.row) }))
    .filter((x) => x.state === 'upcoming' || x.state === 'active')
    .sort((a, b) => {
      const ta = intervalFromMemberRow(a.row)?.start.getTime() ?? 0;
      const tb = intervalFromMemberRow(b.row)?.start.getTime() ?? 0;
      return ta - tb;
    });
  const target = upcoming[0];
  if (!target) {
    return isRu
      ? 'Сейчас нет активных или предстоящих броней для отмены.'
      : 'There are no active or upcoming bookings to cancel.';
  }
  const offerId = memberOfferIdForApi(target.row);
  if (!(offerId > 0)) throw new ApiError(t('booking.errorNoData'), 0);
  const pcName = String(target.row.product_pc_name || '').trim();
  await cancel({
    icafeId: target.icafeId,
    pcName,
    memberOfferId: offerId,
  });
  const pcHuman = formatPublicPcToken(pcName);
  return isRu
    ? `Готово. Отменил ближайшую бронь на месте ${pcHuman}.`
    : `Done. Cancelled the nearest booking for seat ${pcHuman}.`;
}
