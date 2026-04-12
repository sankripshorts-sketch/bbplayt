import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'bbplay.appPreferences.v1';

export type ReminderMode = 'single' | 'triple';

/** Локальный пуш «сегодня есть бронь» */
export type TodaysBookingNotifMode = 'until_ack' | 'once';

/** Снимок выбранного тарифа для восстановления после перезапуска */
export type SavedTariffPreference =
  | {
      kind: 'price';
      price_id: number;
      group_name?: string;
      duration?: string;
    }
  | {
      kind: 'product';
      product_id: number;
      group_name?: string;
    };

export type AppPreferences = {
  favoriteClubId: number | null;
  lastBookingClubId: number | null;
  lastBookingDateISO: string | null;
  /** Последний выбранный тариф (в паре с клубом из lastBookingClubId / favoriteClubId) */
  lastTariff: SavedTariffPreference | null;
  /** Последний тариф по клубу (icafe_id строкой) — не затирает избранный клуб */
  lastTariffByClubId: Record<string, SavedTariffPreference>;
  /** Локально, не отправляется на сервер */
  defaultPartySize: number;
  reminderMode: ReminderMode;
  /** Для режима single — за сколько минут до начала */
  reminderMinutesBefore: number;
  /** За сколько часов до начала напомнить «выезжай» (0 — выкл.) */
  prepDepartHoursBefore: number;
  /** Уведомление о брони сегодня: до подтверждения «Я помню» или один раз за день */
  todaysBookingNotifMode: TodaysBookingNotifMode;
};

const defaults: AppPreferences = {
  favoriteClubId: null,
  lastBookingClubId: null,
  lastBookingDateISO: null,
  lastTariff: null,
  lastTariffByClubId: {},
  defaultPartySize: 1,
  reminderMode: 'single',
  reminderMinutesBefore: 30,
  prepDepartHoursBefore: 2,
  /** Реже спамит, чем `until_ack` (липкое на Android). */
  todaysBookingNotifMode: 'once',
};

export async function loadAppPreferences(): Promise<AppPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    const lastTariffByClubId: Record<string, SavedTariffPreference> = {
      ...defaults.lastTariffByClubId,
      ...(parsed.lastTariffByClubId ?? {}),
    };
    if (parsed.lastTariff && parsed.lastBookingClubId != null) {
      const k = String(parsed.lastBookingClubId);
      if (lastTariffByClubId[k] == null) lastTariffByClubId[k] = parsed.lastTariff;
    }
    const modeRaw = parsed.todaysBookingNotifMode;
    const todaysBookingNotifMode: TodaysBookingNotifMode =
      modeRaw === 'once' || modeRaw === 'until_ack' ? modeRaw : defaults.todaysBookingNotifMode;

    return {
      ...defaults,
      ...parsed,
      lastTariffByClubId,
      todaysBookingNotifMode,
      defaultPartySize: clampParty(parsed.defaultPartySize ?? defaults.defaultPartySize),
      reminderMinutesBefore: Math.max(5, Math.min(180, parsed.reminderMinutesBefore ?? 30)),
      prepDepartHoursBefore: clampPrepHours(parsed.prepDepartHoursBefore ?? defaults.prepDepartHoursBefore),
    };
  } catch {
    return { ...defaults };
  }
}

export async function saveAppPreferences(prefs: AppPreferences): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function clampParty(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(8, Math.max(1, Math.round(n)));
}

/** 0 = выкл., иначе 1–12 ч */
export function clampPrepHours(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(12, Math.max(0, Math.round(n)));
}

export async function patchAppPreferences(patch: Partial<AppPreferences>): Promise<AppPreferences> {
  const cur = await loadAppPreferences();
  const next: AppPreferences = {
    ...cur,
    ...patch,
    lastTariffByClubId:
      patch.lastTariffByClubId != null
        ? { ...cur.lastTariffByClubId, ...patch.lastTariffByClubId }
        : cur.lastTariffByClubId,
    defaultPartySize: patch.defaultPartySize != null ? clampParty(patch.defaultPartySize) : cur.defaultPartySize,
    reminderMinutesBefore:
      patch.reminderMinutesBefore != null
        ? Math.max(5, Math.min(180, patch.reminderMinutesBefore))
        : cur.reminderMinutesBefore,
    prepDepartHoursBefore:
      patch.prepDepartHoursBefore != null ? clampPrepHours(patch.prepDepartHoursBefore) : cur.prepDepartHoursBefore,
    todaysBookingNotifMode: patch.todaysBookingNotifMode ?? cur.todaysBookingNotifMode,
  };
  await saveAppPreferences(next);
  return next;
}
