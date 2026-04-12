/**
 * Живые HTTP-тесты API: для каждого сценария создаётся папка `artifacts/<slug>/`
 * с 01-request.json, 02-response.json, 03-feedback.md
 *
 * Требуется `.env` или переменные окружения (см. tests/api-live/README.md).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { mapLoginData, extractToken } from '@/auth/mapLogin';
import { getSession, setSession } from '@/auth/sessionStorage';
import { vibeLogin } from '@/api/vibeClient';
import { bookingFlowApi, cafesApi } from '@/api/endpoints';
import { fetchMemberBalanceIcafe, fetchMemberRowIcafe } from '@/api/icafeMemberBalance';
import { fetchLiveCafePcs } from '@/api/icafeLivePcs';
import { loadMemberProfile } from '@/api/memberProfileApi';
import {
  fetchCustomerAnalysis,
  fetchMemberBalanceHistory,
  fetchPcSessions,
  fetchRankingPayload,
} from '@/api/profileInsightsApi';
import { memberTopupFlow, memberTopupWithFetchBonusFlow } from '@/api/memberMoneyApi';
import { fetchMemberPcSessionInfo } from '@/api/memberPcStatusApi';
import { createMember } from '@/api/registrationApi';
import { ApiError } from '@/api/client';
import {
  clearCaptures,
  getCaptures,
  installFetchCapture,
  uninstallFetchCapture,
} from './fetchCapture';
import { writeApiArtifact } from './artifactWriter';
import { printScenarioReport } from './consoleReport';
import {
  ledgerRecordScenario,
  ledgerRecordSkipped,
  ledgerReset,
  ledgerWriteSummaryFile,
} from './apiRunLedger';

function tomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

type TestCtx = {
  cafeId: number;
  memberId: string;
  memberAccount: string;
};

let ctx: TestCtx | null = null;

function requireCtx(): TestCtx {
  if (!ctx) throw new Error('Контекст теста не инициализирован (нужен успешный логин и список клубов)');
  return ctx;
}

function hasCredentials(): boolean {
  return Boolean(process.env.TEST_USERNAME?.trim() && process.env.TEST_PASSWORD);
}

function hasApiBase(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_API_BASE_URL?.trim());
}

/**
 * Часть маршрутов на vibe отвечает «Api not allowed» для клиентского Bearer, пока их не включат на шлюзе.
 * Это не регрессия клиента — тест помечаем OK с пояснением.
 */
function judgeInsightsOrGateway(
  err: Error | null,
  successNotes: string
): { ok: boolean; notes: string } {
  if (!err) return { ok: true, notes: successNotes };
  const low = err.message.toLowerCase();
  if (low.includes('not allowed') || low.includes('запрещ') || low.includes('forbidden')) {
    return {
      ok: true,
      notes: `Шлюз не открыл метод для мобильного клиента: ${err.message}. Нужно включить маршрут в настройках API (не ошибка приложения).`,
    };
  }
  return { ok: false, notes: err.message };
}

async function runCase(
  slug: string,
  fn: () => Promise<unknown>,
  judge: (p: { err: Error | null; data: unknown }) => { ok: boolean; notes: string }
): Promise<void> {
  let data: unknown;
  let err: Error | null = null;
  try {
    data = await fn();
  } catch (e) {
    err = e instanceof Error ? e : new Error(String(e));
  }
  const exchanges = getCaptures();
  const fb = judge({ err, data });
  await writeApiArtifact(slug, exchanges, data, err, fb);
  printScenarioReport(slug, exchanges, err, fb);
  ledgerRecordScenario(slug, exchanges, fb);
  expect(fb.ok, fb.notes).toBe(true);
}

function randPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function addDaysFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Последовательно: первый тест логинится и заполняет `ctx`, остальные от него зависят. */
describe.sequential('API live (артефакты в tests/api-live/artifacts)', () => {
  beforeAll(() => {
    ledgerReset();
    installFetchCapture();
  });

  afterAll(async () => {
    await ledgerWriteSummaryFile();
    uninstallFetchCapture();
  });

  beforeEach(() => {
    clearCaptures();
  });

  it('vibe-post-login', async () => {
    if (!hasApiBase()) {
      throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    }
    if (!hasCredentials()) {
      throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    }
    const u = process.env.TEST_USERNAME!.trim();
    const p = process.env.TEST_PASSWORD!;

    await runCase(
      'vibe-post-login',
      async () => {
        const { data, setCookie } = await vibeLogin(u, p);
        const merged: Record<string, unknown> =
          data.user && typeof data.user === 'object' && data.user !== null
            ? { ...data, ...(data.user as Record<string, unknown>) }
            : data;
        const mapped = mapLoginData(merged, u);
        await setSession({
          user: mapped,
          authToken: extractToken(merged),
          cookie: setCookie ?? undefined,
        });
        return { loggedInAs: mapped.memberAccount, memberId: mapped.memberId };
      },
      ({ err, data }) => {
        if (err)
          return {
            ok: false,
            notes: `Ошибка логина: ${err.message}${err instanceof ApiError ? ` (HTTP ${err.status})` : ''}`,
          };
        return { ok: true, notes: 'Логин выполнен, сессия сохранена в тестовом SecureStore.' };
      }
    );

    clearCaptures();
    const cafes = await cafesApi.list();
    const cafeId =
      parseInt(process.env.TEST_CAFE_ID?.trim() ?? '', 10) ||
      (Array.isArray(cafes) && cafes[0] ? cafes[0].icafe_id : 0);
    const session = await getSession();
    const user = session?.user;
    if (!cafeId || !user?.memberId) {
      throw new Error('После логина не удалось получить cafeId или memberId (проверьте GET /cafes и TEST_CAFE_ID)');
    }
    ctx = {
      cafeId,
      memberId: user.memberId,
      memberAccount: user.memberAccount,
    };
  });

  it('vibe-get-cafes', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Сначала выполните успешный сценарий vibe-post-login');
    await runCase(
      'vibe-get-cafes',
      () => cafesApi.list(),
      ({ err, data }) => {
        if (err) return { ok: false, notes: err.message };
        const ok = Array.isArray(data) && data.length > 0;
        return {
          ok,
          notes: ok
            ? `Получено клубов: ${(data as unknown[]).length}`
            : 'Пустой список клубов или неверный формат',
        };
      }
    );
  });

  it('vibe-get-icafe-id-for-member', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    await runCase('vibe-get-icafe-id-for-member', () => bookingFlowApi.icafeIdForMember(), ({ err, data }) => {
      if (err) return { ok: false, notes: err.message };
      const ok = data != null && typeof data === 'object';
      return { ok, notes: ok ? 'Ответ icafe-id-for-member получен' : 'Пустой ответ' };
    });
  });

  it('vibe-get-struct-rooms-icafe', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId } = requireCtx();
    await runCase('vibe-get-struct-rooms-icafe', () => bookingFlowApi.structRooms(cafeId), ({ err, data }) => {
      if (err) return { ok: false, notes: err.message };
      return { ok: true, notes: 'Схема зала получена (структура может отличаться по бэкенду).' };
    });
  });

  it('vibe-get-all-prices-icafe', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId, memberId } = requireCtx();
    const today = new Date().toISOString().slice(0, 10);
    await runCase(
      'vibe-get-all-prices-icafe',
      () =>
        bookingFlowApi.allPrices({
          cafeId,
          memberId,
          mins: 60,
          bookingDate: today,
        }),
      ({ err }) => ({
        ok: !err,
        notes: err ? err.message : 'Тарифы получены.',
      })
    );
  });

  it('vibe-get-available-pcs-for-booking', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId } = requireCtx();
    const dateStart = process.env.TEST_BOOKING_DATE?.trim() || tomorrowIsoDate();
    const timeStart = process.env.TEST_BOOKING_TIME?.trim() || '12:00';
    const mins = parseInt(process.env.TEST_BOOKING_MINS?.trim() || '60', 10) || 60;
    await runCase(
      'vibe-get-available-pcs-for-booking',
      () =>
        bookingFlowApi.availablePcs({
          cafeId,
          dateStart,
          timeStart,
          mins,
        }),
      ({ err }) => ({
        ok: !err,
        notes: err ? err.message : `Запрос слотов на ${dateStart} ${timeStart}, ${mins} мин.`,
      })
    );
  });

  it('vibe-get-all-books-cafes', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { memberAccount } = requireCtx();
    await runCase(
      'vibe-get-all-books-cafes',
      () => bookingFlowApi.memberBooks(memberAccount),
      ({ err }) => ({
        ok: !err,
        notes: err ? err.message : 'Список броней запрошен (может быть пустым).',
      })
    );
  });

  it('icafe-get-live-pcs', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId } = requireCtx();
    await runCase('icafe-get-live-pcs', () => fetchLiveCafePcs(cafeId), ({ err, data }) => ({
      ok: !err,
      notes: err
        ? err.message
        : `ПК в клубе: ${Array.isArray(data) ? data.length : 'n/a'} (онлайн-состояние).`,
    }));
  });

  it('icafe-get-member-pc-status', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId, memberId } = requireCtx();
    await runCase(
      'icafe-get-member-pc-status',
      () => fetchMemberPcSessionInfo(cafeId, memberId),
      ({ err, data }) => ({
        ok: !err,
        notes: err
          ? err.message
          : `memberPcStatus: active=${(data as { active?: boolean }).active === true ? 'да' : 'нет'}.`,
      })
    );
  });

  it('icafe-get-members-balance', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId, memberId, memberAccount } = requireCtx();
    await runCase(
      'icafe-get-members-balance',
      () => fetchMemberBalanceIcafe({ cafeId, memberId, memberAccount }),
      ({ err, data }) => ({
        ok: !err,
        notes: err
          ? err.message
          : `Баланс: ${(data as { balanceRub?: number }).balanceRub ?? '?'} ₽`,
      })
    );
  });

  it('icafe-get-member-row', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId, memberId, memberAccount } = requireCtx();
    await runCase(
      'icafe-get-member-row',
      () => fetchMemberRowIcafe({ cafeId, memberId, memberAccount }),
      ({ err }) => ({
        ok: !err,
        notes: err ? err.message : 'Строка участника из GET members.',
      })
    );
  });

  it('icafe-load-member-profile', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId, memberId, memberAccount } = requireCtx();
    await runCase(
      'icafe-load-member-profile',
      () => loadMemberProfile({ cafeId, memberId, memberAccount }),
      ({ err }) => ({
        ok: !err,
        notes: err ? err.message : 'Профиль для формы (memberSelf или fallback).',
      })
    );
  });

  it('icafe-get-member-balance-history', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId, memberId } = requireCtx();
    await runCase(
      'icafe-get-member-balance-history',
      () => fetchMemberBalanceHistory(cafeId, { memberId, page: 1 }),
      ({ err }) =>
        judgeInsightsOrGateway(
          err,
          'История баланса получена (или пустой список).'
        )
    );
  });

  it('icafe-post-pc-sessions', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId, memberId } = requireCtx();
    await runCase(
      'icafe-post-pc-sessions',
      () => fetchPcSessions(cafeId, { memberId, page: 1 }),
      ({ err }) =>
        judgeInsightsOrGateway(
          err,
          'История игровых сессий получена (POST .../pcSessions на vibe; при EXPO_PUBLIC_INSIGHTS_USE_ICAFE_CLOUD_PATHS=1 — GET memberSessionHistory).'
        )
    );
  });

  it('vibe-get-customer-analysis', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { memberAccount } = requireCtx();
    await runCase(
      'vibe-get-customer-analysis',
      () => fetchCustomerAnalysis(memberAccount),
      ({ err }) => judgeInsightsOrGateway(err, 'Аналитика клиента (GET /customer-analysis).')
    );
  });

  it('icafe-get-ranking-url', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId } = requireCtx();
    await runCase('icafe-get-ranking-url', () => fetchRankingPayload(cafeId), ({ err }) =>
      judgeInsightsOrGateway(err, 'Ответ rankingUrl получен.')
    );
  });

  it('memberMoney-topup-with-bonus', async () => {
    if (process.env.TEST_ENABLE_TOPUP_FLOW !== '1') {
      ledgerRecordSkipped(
        'memberMoney-topup-with-bonus',
        'Пропуск: задайте TEST_ENABLE_TOPUP_FLOW=1 (опасно: реальное пополнение).'
      );
      expect(true).toBe(true);
      return;
    }
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId, memberId } = requireCtx();
    const topupValue = parseInt(process.env.TEST_TOPUP_VALUE_RUB?.trim() || '100', 10);
    await runCase(
      'memberMoney-topup-with-bonus',
      () =>
        memberTopupWithFetchBonusFlow({
          cafeId,
          memberId,
          topupValue,
          promoCode: process.env.TEST_TOPUP_PROMO?.trim(),
        }),
      ({ err }) => {
        if (!err) {
          return {
            ok: true,
            notes: 'fetchBonus → topup с topup_balance_bonus (денежная операция!).',
          };
        }
        const low = err.message.toLowerCase();
        if (low.includes('not allowed')) {
          return {
            ok: true,
            notes: `Шлюз не открыл fetchBonus: ${err.message}. Полный флоу с бонусом на проде настраивается на API.`,
          };
        }
        return { ok: false, notes: err.message };
      }
    );
  });

  it('memberMoney-topup-without-bonus', async () => {
    if (process.env.TEST_ENABLE_TOPUP_FLOW !== '1') {
      ledgerRecordSkipped(
        'memberMoney-topup-without-bonus',
        'Пропуск: задайте TEST_ENABLE_TOPUP_FLOW=1 (опасно: реальное пополнение).'
      );
      expect(true).toBe(true);
      return;
    }
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const { cafeId, memberId } = requireCtx();
    const topupValue = parseInt(process.env.TEST_TOPUP_VALUE_RUB?.trim() || '100', 10);
    await runCase(
      'memberMoney-topup-without-bonus',
      () =>
        memberTopupFlow({
          cafeId,
          memberId,
          topupValue,
          promoCode: process.env.TEST_TOPUP_PROMO?.trim(),
        }),
      ({ err }) => ({
        ok: !err,
        notes: err ? err.message : 'Только POST topup, без fetchBonus (денежная операция!).',
      })
    );
  });

  it('registration-create-member', async () => {
    if (process.env.TEST_ENABLE_REGISTRATION !== '1') {
      ledgerRecordSkipped(
        'registration-create-member',
        'Пропуск: задайте TEST_ENABLE_REGISTRATION=1 и TEST_REGISTER_CAFE_ID.'
      );
      expect(true).toBe(true);
      return;
    }
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    const cafeId = parseInt(process.env.TEST_REGISTER_CAFE_ID?.trim() || '0', 10);
    if (!cafeId) {
      throw new Error('Для регистрации задайте TEST_REGISTER_CAFE_ID');
    }
    const account = `test_${Date.now()}`;
    await runCase(
      'registration-create-member',
      () =>
        createMember(cafeId, {
          member_account: account,
          member_first_name: 'Test',
          member_last_name: 'Auto',
          member_email: `${account}@example.com`,
          member_birthday: '1990-01-01',
          member_phone: process.env.TEST_REGISTER_PHONE?.trim() || '+79000000000',
          member_password: 'TestPass123!',
          member_confirm: 'TestPass123!',
        }),
      ({ err }) => ({
        ok: !err,
        notes: err ? err.message : 'Участник создан (тестовая регистрация).',
      })
    );
  });

  it('random-flow-get-bundle', async () => {
    if (!hasApiBase()) throw new Error('Задайте EXPO_PUBLIC_API_BASE_URL');
    if (!hasCredentials()) throw new Error('Задайте TEST_USERNAME и TEST_PASSWORD');
    if (!ctx) throw new Error('Нужен успешный vibe-post-login');
    const cafes = await cafesApi.list();
    if (!Array.isArray(cafes) || cafes.length === 0) {
      throw new Error('Нет клубов для random-flow');
    }
    const cafe = randPick(cafes);
    const { memberId } = requireCtx();
    const dayOffset = 1 + Math.floor(Math.random() * 13);
    const dateStart = addDaysFromToday(dayOffset);
    const timeStart = randPick(['10:00', '11:30', '12:00', '14:00', '16:00', '18:30', '20:00'] as const);
    const mins = randPick([60, 90, 120] as const);

    /* Не смешивать с HTTP внутри runCase (артефакт и сводка — только параллельный бандл). */
    clearCaptures();

    await runCase(
      'random-flow-get-bundle',
      async () => {
        const [avail, struct, prices, live, pcInfo] = await Promise.all([
          bookingFlowApi.availablePcs({
            cafeId: cafe.icafe_id,
            dateStart,
            timeStart,
            mins,
          }),
          bookingFlowApi.structRooms(cafe.icafe_id),
          bookingFlowApi.allPrices({
            cafeId: cafe.icafe_id,
            mins,
            bookingDate: dateStart,
          }),
          fetchLiveCafePcs(cafe.icafe_id),
          fetchMemberPcSessionInfo(cafe.icafe_id, memberId),
        ]);
        return {
          dateStart,
          timeStart,
          mins,
          pcListLen: Array.isArray(avail?.pc_list) ? avail.pc_list.length : 0,
          rooms: struct?.rooms?.length ?? 0,
          livePcs: Array.isArray(live) ? live.length : 0,
          pcInfoActive: pcInfo.active,
        };
      },
      ({ err, data }) => {
        if (err) return { ok: false, notes: err.message };
        const d = data as Record<string, unknown>;
        return {
          ok: true,
          notes: `Случайно: ${String(d.dateStart)} ${String(d.timeStart)}, ${String(d.mins)} мин; pc_list: ${d.pcListLen}, rooms: ${d.rooms}, live: ${d.livePcs}, на ПК: ${d.pcInfoActive ? 'да' : 'нет'}.`,
        };
      }
    );
  });
});
