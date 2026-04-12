import { resolveMemberIdCanonical } from '../auth/mapLogin';
import { getSession } from '../auth/sessionStorage';
import { ApiError } from './client';
import { ensureIcafePostSuccess, icafePostJsonWithAuth } from './icafeClient';
import { fetchTopupProductIdForCafe } from './topupCatalog';

/**
 * `topup_ids` в официальном iCafe Cloud — строка с **member id** участников (`"1,2,3"`).
 * Раньше по умолчанию подставлялся `product_id` из каталога (BLACKBEARS / `docs/api-spec.md`), из‑за чего
 * upstream искал «участника» с таким id → **Member not found**.
 *
 * По умолчанию: canonical member id. Режим каталога: `EXPO_PUBLIC_TOPUP_IDS_USE_PRODUCT_ID=1`.
 */
async function wireTopupIdsForRequest(cafeId: number, memberId: string): Promise<string> {
  if (process.env.EXPO_PUBLIC_TOPUP_IDS_USE_PRODUCT_ID === '1') {
    try {
      const pid = await fetchTopupProductIdForCafe({ cafeId, memberId });
      return String(pid);
    } catch (e) {
      const mid = await resolveMemberIdForTopupApi(memberId);
      const t = mid.trim();
      if (!t) {
        throw new ApiError('Не удалось определить member_id для резервного topup_ids', 0);
      }
      if (process.env.EXPO_PUBLIC_TOPUP_STRICT_PRODUCT_ID === '1') {
        const msg = e instanceof Error ? e.message : String(e);
        throw new ApiError(
          msg === 'NO_TOPUP_PRODUCT_IN_CATALOG'
            ? 'В каталоге клуба нет товара для пополнения (GET /all-prices-icafe → products)'
            : msg,
          0,
        );
      }
      return t;
    }
  }
  const mid = await resolveMemberIdForTopupApi(memberId);
  const t = mid.trim();
  if (!t) {
    throw new ApiError('Не удалось определить member_id для topup_ids', 0);
  }
  return t;
}

/**
 * По умолчанию `member_id` в теле topup — строка (как в UI профиля / PHP).
 * EXPO_PUBLIC_TOPUP_MEMBER_ID_AS_NUMBER=1 — число в JSON.
 */
function wireMemberIdForTopup(memberId: string): string | number {
  const t = memberId.trim();
  if (process.env.EXPO_PUBLIC_TOPUP_MEMBER_ID_AS_NUMBER === '1') {
    const n = Number(t);
    if (Number.isSafeInteger(n) && n > 0) return n;
  }
  return t;
}

/** Берём id из `user.raw` после логина, чтобы совпадал с экраном профиля. */
async function resolveMemberIdForTopupApi(fallback: string): Promise<string> {
  const session = await getSession();
  const raw = session?.user?.raw;
  if (raw && typeof raw === 'object') {
    const id = resolveMemberIdCanonical(raw as Record<string, unknown>);
    if (id) return id;
  }
  return fallback.trim();
}

/**
 * Один формат `member_id` для POST к клубу (topup, memberChangePassword и т.д.):
 * по умолчанию строка; число только при `EXPO_PUBLIC_TOPUP_MEMBER_ID_AS_NUMBER=1`.
 * Совпадает с `wireMemberIdForTopup` — иначе шлюз мог отвечать «успех» без эффекта.
 */
export async function resolveMemberIdForIcafePostBody(fallbackFromSessionUser: string): Promise<string | number> {
  const mid = await resolveMemberIdForTopupApi(fallbackFromSessionUser);
  return wireMemberIdForTopup(mid);
}

/**
 * Прокси/upstream иногда ищут участника только по `member_id`, тогда как в GET /members вы
 * находите того же человека по `member_account`. Добавляем контекст клуба и логин.
 *
 * Логин и логин в iCafe: `member_account` и при необходимости `member_icafe_id` — из `user.raw` (ответ POST /login).
 * `icafe_id` в теле **совпадает с `cafeId` в URL** (из `GET /icafe-id-for-member`), иначе прокси/upstream получают
 * несогласованный запрос. `member_icafe_id` добавляем только если совпадает с этим же `cafeId`.
 *
 * EXPO_PUBLIC_TOPUP_MINIMAL_BODY=1 — не добавлять доп. поля (если бэкенд их отвергает).
 */
async function enrichTopupMemberContext(body: Record<string, unknown>, cafeId: number): Promise<void> {
  if (process.env.EXPO_PUBLIC_TOPUP_MINIMAL_BODY === '1') return;
  const session = await getSession();
  const user = session?.user;
  if (!user) return;

  const raw = user.raw;
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    const accRaw = r.member_account != null ? String(r.member_account).trim() : '';
    if (accRaw) {
      body.member_account = accRaw;
    }
  }
  if (!body.member_account && user.memberAccount?.trim()) {
    body.member_account = user.memberAccount.trim();
  }

  body.icafe_id = cafeId;

  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    const mic = r.member_icafe_id;
    if (mic != null && String(mic).trim() !== '') {
      const n = Number(mic);
      if (Number.isFinite(n) && n > 0 && n === cafeId) {
        body.member_icafe_id = n;
      }
    }
    if (process.env.EXPO_PUBLIC_TOPUP_USE_COMPOSITE_AS_MEMBER_ID === '1') {
      const composite = r.member_id_icafe_id;
      if (composite != null && String(composite).trim() !== '') {
        body.member_id = String(composite).trim();
      }
    } else if (process.env.EXPO_PUBLIC_TOPUP_INCLUDE_COMPOSITE_ID === '1') {
      const composite = r.member_id_icafe_id;
      if (composite != null && String(composite).trim() !== '') {
        body.member_id_icafe_id = String(composite).trim();
      }
    }
  }
}

/**
 * `topup` / `fetchBonus`: с `Authorization: Bearer` из сессии (тот же токен, что и для GET members).
 * Без Bearer прокси/upstream часто отвечают «Member not found».
 * Старый режим только с телом: EXPO_PUBLIC_TOPUP_WITHOUT_BEARER=1 (+ private_key в теле).
 */
async function postTopupAction(
  path: string,
  body: Record<string, unknown>,
  cafeId: number,
): Promise<Record<string, unknown>> {
  await enrichTopupMemberContext(body, cafeId);
  if (process.env.EXPO_PUBLIC_TOPUP_WITHOUT_BEARER === '1') {
    const { icafePostJson } = await import('./icafeClient');
    const session = await getSession();
    const pk = session?.user?.raw?.private_key;
    if (typeof pk === 'string' && pk.trim()) {
      body.private_key = pk.trim();
    }
    return icafePostJson<Record<string, unknown>>(path, body);
  }
  return icafePostJsonWithAuth<Record<string, unknown>>(path, body);
}

/** Имя поля промокода в теле fetchBonus/topup (если бэкенд ожидает другое имя — задайте env). */
function topupPromoFieldName(): string {
  return process.env.EXPO_PUBLIC_TOPUP_PROMO_FIELD?.trim() || 'promo_code';
}

function parseMoneyField(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Разбор суммы бонуса из ответа `fetchBonus` (когда бэкенд снова включит предпросмотр бонуса). */
export function extractTopupBonusFromFetch(raw: Record<string, unknown>): number | undefined {
  const keys = [
    'topup_balance_bonus',
    'topupBalance',
    'balance_bonus',
    'bonus_balance',
    'bonus_value',
    'bonus',
    'bonus_amount',
    'member_balance_bonus',
  ];
  const tryObj = (o: Record<string, unknown>): number | undefined => {
    for (const k of keys) {
      const n = parseMoneyField(o[k]);
      if (n != null && n >= 0) return n;
    }
    return undefined;
  };
  const data = raw.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = tryObj(data as Record<string, unknown>);
    if (d != null) return d;
  }
  return tryObj(raw);
}

export type FetchTopupBonusResult = {
  bonusAmount?: number;
  raw: Record<string, unknown>;
};

/**
 * Предпросмотр бонуса к пополнению (когда доступно на шлюзе).
 * `POST /api/v2/cafe/{cafeId}/members/action/fetchBonus`
 */
export async function fetchMemberTopupBonus(params: {
  cafeId: number;
  memberId: string;
  topupValue: number;
  promoCode?: string;
}): Promise<FetchTopupBonusResult> {
  const path = `api/v2/cafe/${params.cafeId}/members/action/fetchBonus`;
  const mid = await resolveMemberIdForTopupApi(params.memberId);
  const topupIdsWire = await wireTopupIdsForRequest(params.cafeId, params.memberId);
  const body: Record<string, unknown> = {
    member_id: wireMemberIdForTopup(mid),
    topup_value: params.topupValue,
    topup: params.topupValue,
    topup_ids: topupIdsWire,
  };
  const promo = params.promoCode?.trim();
  if (promo) {
    body[topupPromoFieldName()] = promo;
  }
  const raw = await postTopupAction(path, body, params.cafeId);
  ensureIcafePostSuccess(raw);
  const bonusAmount = extractTopupBonusFromFetch(raw);
  return { bonusAmount, raw };
}

/**
 * Зачисление на баланс.
 * `POST /api/v2/cafe/{cafeId}/members/action/topup`
 *
 * Опционально `topup_balance_bonus` — если заранее известен (например из fetchBonus).
 */
export async function memberTopup(params: {
  cafeId: number;
  memberId: string;
  topupValue: number;
  promoCode?: string;
  topupBalanceBonus?: number;
}): Promise<void> {
  if (!Number.isFinite(params.topupValue) || params.topupValue <= 0) {
    throw new ApiError('Сумма пополнения должна быть больше нуля', 0);
  }
  const path = `api/v2/cafe/${params.cafeId}/members/action/topup`;
  const mid = await resolveMemberIdForTopupApi(params.memberId);
  const topupIdsWire = await wireTopupIdsForRequest(params.cafeId, params.memberId);
  const body: Record<string, unknown> = {
    member_id: wireMemberIdForTopup(mid),
    topup_value: params.topupValue,
    topup_ids: topupIdsWire,
  };
  const promo = params.promoCode?.trim();
  if (promo) {
    body[topupPromoFieldName()] = promo;
  }
  const b = params.topupBalanceBonus;
  if (b != null && Number.isFinite(b) && b >= 0) {
    body.topup_balance_bonus = b;
  }
  const raw = await postTopupAction(path, body, params.cafeId);
  ensureIcafePostSuccess(raw);
}

/**
 * Сценарий пополнения из приложения: один POST .../topup (без fetchBonus и без `topup_balance_bonus`).
 */
export async function memberTopupFlow(params: {
  cafeId: number;
  memberId: string;
  topupValue: number;
  promoCode?: string;
}): Promise<void> {
  await memberTopup({
    cafeId: params.cafeId,
    memberId: params.memberId,
    topupValue: params.topupValue,
    promoCode: params.promoCode,
  });
}

/**
 * Сначала `fetchBonus`, затем `topup` с `topup_balance_bonus` из ответа (если сервер вернул сумму).
 */
export async function memberTopupWithFetchBonusFlow(params: {
  cafeId: number;
  memberId: string;
  topupValue: number;
  promoCode?: string;
}): Promise<void> {
  const { bonusAmount } = await fetchMemberTopupBonus({
    cafeId: params.cafeId,
    memberId: params.memberId,
    topupValue: params.topupValue,
    promoCode: params.promoCode,
  });
  await memberTopup({
    cafeId: params.cafeId,
    memberId: params.memberId,
    topupValue: params.topupValue,
    promoCode: params.promoCode,
    topupBalanceBonus: bonusAmount,
  });
}

/**
 * Типичный флоу из доки (fetchBonus → topup). Если шлюз не отдаёт fetchBonus — только topup.
 */
export async function memberTopupSmartFlow(params: {
  cafeId: number;
  memberId: string;
  topupValue: number;
  promoCode?: string;
}): Promise<void> {
  let bonusAmount: number | undefined;
  try {
    const r = await fetchMemberTopupBonus({
      cafeId: params.cafeId,
      memberId: params.memberId,
      topupValue: params.topupValue,
      promoCode: params.promoCode,
    });
    bonusAmount = r.bonusAmount;
  } catch {
    /* fetchBonus часто отключён на прокси («Api not allowed») */
  }
  await memberTopup({
    cafeId: params.cafeId,
    memberId: params.memberId,
    topupValue: params.topupValue,
    promoCode: params.promoCode,
    topupBalanceBonus: bonusAmount,
  });
}
