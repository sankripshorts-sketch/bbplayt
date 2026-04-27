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
  /**
   * Город из настроек (id из `BB_CITIES`). null — автоматически: клуб из брони / гео / дефолт.
   */
  cityIdManual: string | null;
  /** Результат однократной геоподсказки (пока нет клуба в префах). */
  cityIdFromGeo: string | null;
  /** Уже запрашивали геолокацию для города (успех или отказ — не дёргать снова). */
  cityGeoAttempted: boolean;
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
  /**
   * Бонусы с локальных акций (мини-игра и т.д.). Пока не синхронизируются с сервером.
   * В будущем зачисление будет и на стороне сервера.
   */
  localPromoBonusRub: number;
  /** Мини-игра кубик: укороченный бросок (вращение) */
  diceMinigameFastRoll: boolean;
  /** Мини-игра кубик: следующий бросок сам после раунда */
  diceMinigameAutoRoll: boolean;
  /** Мини-игра: начало текущего 24-ч периода (мс) для бесплатного броска */
  diceMinigamePeriodStartMs: number;
  /** Бесплатный дневной бросок уже использован в текущем периоде */
  diceMinigameDailyUsed: boolean;
  /** Доп. броски (например, за пополнение от 500 ₽) */
  diceMinigameExtraRolls: number;
  /** Один раз после входа: полноэкранное объявление мини-игры с кубиками */
  diceWelcomePromoSeen: boolean;
};

const defaults: AppPreferences = {
  favoriteClubId: null,
  lastBookingClubId: null,
  lastBookingDateISO: null,
  cityIdManual: null,
  cityIdFromGeo: null,
  cityGeoAttempted: false,
  lastTariff: null,
  lastTariffByClubId: {},
  defaultPartySize: 1,
  reminderMode: 'single',
  reminderMinutesBefore: 30,
  prepDepartHoursBefore: 2,
  /** Реже спамит, чем `until_ack` (липкое на Android). */
  todaysBookingNotifMode: 'once',
  localPromoBonusRub: 0,
  diceMinigameFastRoll: false,
  diceMinigameAutoRoll: false,
  diceMinigamePeriodStartMs: 0,
  diceMinigameDailyUsed: false,
  diceMinigameExtraRolls: 0,
  diceWelcomePromoSeen: false,
};

const DICE_PERIOD_MS = 24 * 60 * 60 * 1000;
const DICE_MAX_EXTRA_ROLLS = 1_000_000;

function clampDiceExtraRolls(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(DICE_MAX_EXTRA_ROLLS, Math.floor(n));
}

/**
 * 24-ч «сутки» от `diceMinigamePeriodStartMs`: неиспользованный дневной бросок сгорает на границе периода.
 */
export function reconcileDiceMinigameState(p: AppPreferences, nowMs: number = Date.now()): AppPreferences {
  const extra0 = clampDiceExtraRolls(p.diceMinigameExtraRolls);
  const periodStart = p.diceMinigamePeriodStartMs;
  if (!periodStart || !Number.isFinite(periodStart) || periodStart <= 0) {
    return { ...p, diceMinigamePeriodStartMs: nowMs, diceMinigameDailyUsed: false, diceMinigameExtraRolls: extra0 };
  }
  let next: AppPreferences = { ...p, diceMinigameExtraRolls: extra0 };
  while (nowMs >= next.diceMinigamePeriodStartMs + DICE_PERIOD_MS) {
    next = {
      ...next,
      diceMinigamePeriodStartMs: next.diceMinigamePeriodStartMs + DICE_PERIOD_MS,
      diceMinigameDailyUsed: false,
    };
  }
  return next;
}

export function diceMinigameStateChanged(before: AppPreferences, after: AppPreferences): boolean {
  return (
    before.diceMinigamePeriodStartMs !== after.diceMinigamePeriodStartMs ||
    before.diceMinigameDailyUsed !== after.diceMinigameDailyUsed ||
    before.diceMinigameExtraRolls !== after.diceMinigameExtraRolls
  );
}

export function getDiceRollsTotalAvailable(p: AppPreferences, nowMs?: number): number {
  const r = reconcileDiceMinigameState(p, nowMs);
  const daily = r.diceMinigameDailyUsed ? 0 : 1;
  return daily + clampDiceExtraRolls(r.diceMinigameExtraRolls);
}

export async function loadAppPreferences(): Promise<AppPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const b = { ...defaults };
      const w = reconcileDiceMinigameState(b);
      await saveAppPreferences(w);
      return w;
    }
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

    const localPromo = parsed.localPromoBonusRub;
    const localPromoBonusRub =
      localPromo != null && Number.isFinite(localPromo) && localPromo >= 0
        ? Math.min(1_000_000, localPromo)
        : defaults.localPromoBonusRub;

    const merged: AppPreferences = {
      ...defaults,
      ...parsed,
      lastTariffByClubId,
      todaysBookingNotifMode,
      cityIdManual: parsed.cityIdManual ?? defaults.cityIdManual,
      cityIdFromGeo: parsed.cityIdFromGeo ?? defaults.cityIdFromGeo,
      cityGeoAttempted: parsed.cityGeoAttempted ?? defaults.cityGeoAttempted,
      defaultPartySize: clampParty(parsed.defaultPartySize ?? defaults.defaultPartySize),
      reminderMinutesBefore: Math.max(5, Math.min(180, parsed.reminderMinutesBefore ?? 30)),
      prepDepartHoursBefore: clampPrepHours(parsed.prepDepartHoursBefore ?? defaults.prepDepartHoursBefore),
      localPromoBonusRub,
      diceMinigameFastRoll: parsed.diceMinigameFastRoll ?? defaults.diceMinigameFastRoll,
      diceMinigameAutoRoll: parsed.diceMinigameAutoRoll ?? defaults.diceMinigameAutoRoll,
      diceMinigamePeriodStartMs:
        parsed.diceMinigamePeriodStartMs != null && Number.isFinite(parsed.diceMinigamePeriodStartMs)
          ? parsed.diceMinigamePeriodStartMs
          : defaults.diceMinigamePeriodStartMs,
      diceMinigameDailyUsed:
        typeof parsed.diceMinigameDailyUsed === 'boolean'
          ? parsed.diceMinigameDailyUsed
          : defaults.diceMinigameDailyUsed,
      diceMinigameExtraRolls: clampDiceExtraRolls(
        parsed.diceMinigameExtraRolls ?? defaults.diceMinigameExtraRolls,
      ),
      diceWelcomePromoSeen:
        typeof parsed.diceWelcomePromoSeen === 'boolean'
          ? parsed.diceWelcomePromoSeen
          : defaults.diceWelcomePromoSeen,
    };
    const withDice = reconcileDiceMinigameState(merged);
    if (diceMinigameStateChanged(merged, withDice)) {
      await saveAppPreferences(withDice);
    }
    return withDice;
  } catch {
    return reconcileDiceMinigameState({ ...defaults });
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
    cityIdManual: patch.cityIdManual !== undefined ? patch.cityIdManual : cur.cityIdManual,
    cityIdFromGeo: patch.cityIdFromGeo !== undefined ? patch.cityIdFromGeo : cur.cityIdFromGeo,
    cityGeoAttempted: patch.cityGeoAttempted !== undefined ? patch.cityGeoAttempted : cur.cityGeoAttempted,
    localPromoBonusRub:
      patch.localPromoBonusRub !== undefined
        ? (() => {
            const n = patch.localPromoBonusRub;
            if (!Number.isFinite(n) || n < 0) return cur.localPromoBonusRub;
            return Math.min(1_000_000, n);
          })()
        : cur.localPromoBonusRub,
    diceMinigameFastRoll: patch.diceMinigameFastRoll ?? cur.diceMinigameFastRoll,
    diceMinigameAutoRoll: patch.diceMinigameAutoRoll ?? cur.diceMinigameAutoRoll,
    diceMinigamePeriodStartMs:
      patch.diceMinigamePeriodStartMs !== undefined && Number.isFinite(patch.diceMinigamePeriodStartMs)
        ? patch.diceMinigamePeriodStartMs
        : cur.diceMinigamePeriodStartMs,
    diceMinigameDailyUsed:
      patch.diceMinigameDailyUsed !== undefined ? patch.diceMinigameDailyUsed : cur.diceMinigameDailyUsed,
    diceMinigameExtraRolls:
      patch.diceMinigameExtraRolls !== undefined
        ? clampDiceExtraRolls(patch.diceMinigameExtraRolls)
        : cur.diceMinigameExtraRolls,
    diceWelcomePromoSeen:
      patch.diceWelcomePromoSeen !== undefined ? patch.diceWelcomePromoSeen : cur.diceWelcomePromoSeen,
  };
  const fin = reconcileDiceMinigameState(next);
  await saveAppPreferences(fin);
  return fin;
}
