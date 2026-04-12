import { getSession } from '../auth/sessionStorage';
import { ApiError } from './client';
import { resolveMemberIdForIcafePostBody } from './memberMoneyApi';
import {
  ensureIcafePostSuccess,
  ensureIcafeWriteSuccess,
  icafeGetJsonWithAuth,
  icafePostJsonWithAuth,
  icafePutJsonWithAuth,
} from './icafeClient';
import { fetchMemberRowIcafe } from './icafeMemberBalance';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** YYYY-MM-DD → ДД.ММ.ГГГГ */
export function isoBirthdayToDisplay(iso: string): string {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export type EditableMemberFields = {
  member_first_name: string;
  member_last_name: string;
  member_email: string;
  member_phone: string;
  /** ДД.ММ.ГГГГ для полей ввода */
  member_birthday_display: string;
};

/** Поля из строки участника, нужные для PUT по доке iCafe Cloud (в т.ч. `member_oauth_platform`). */
export type MemberIcafePreserveFields = {
  member_group_id: number;
  member_oauth_platform: string;
  member_is_active: number;
  member_expire_time_local: string;
};

export type LoadedMemberProfile = EditableMemberFields & MemberIcafePreserveFields;

function parseMemberGroupId(row: Record<string, unknown>): number {
  const v = row.member_group_id;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseMemberIsActive(row: Record<string, unknown>): number {
  const v = row.member_is_active;
  if (v === 0 || v === 1) return v;
  const n = Number(v);
  return n === 0 ? 0 : 1;
}

function rowToLoaded(row: Record<string, unknown>): LoadedMemberProfile {
  const b = row.member_birthday != null ? String(row.member_birthday) : '';
  const exp =
    row.member_expire_time_local != null ? String(row.member_expire_time_local).trim() : '0000-00-00';
  const oauth = String(row.member_oauth_platform ?? 'account').trim() || 'account';
  return {
    member_first_name: String(row.member_first_name ?? row.first_name ?? '').trim(),
    member_last_name: String(row.member_last_name ?? row.last_name ?? '').trim(),
    member_email: String(row.member_email ?? row.email ?? '').trim(),
    member_phone: String(row.member_phone ?? row.phone ?? '').trim(),
    member_birthday_display: b.includes('-') ? isoBirthdayToDisplay(b) : b,
    member_group_id: parseMemberGroupId(row),
    member_oauth_platform: oauth,
    member_is_active: parseMemberIsActive(row),
    member_expire_time_local: exp || '0000-00-00',
  };
}

/**
 * Профиль: сначала GET memberSelf, иначе строка из GET members.
 */
export async function loadMemberProfile(params: {
  cafeId: number;
  memberId: string;
  memberAccount: string;
}): Promise<LoadedMemberProfile> {
  try {
    /** По доке — с `Authorization: Bearer`; без сессии прокси может отдавать пустой/чужой ответ. */
    const raw = await icafeGetJsonWithAuth<Record<string, unknown>>(
      `api/v2/cafe/${params.cafeId}/memberSelf`,
    );
    const inner = asRecord(raw.data) ?? asRecord(raw.member);
    const data =
      inner ?? (raw.member_id != null || raw.member_account != null ? asRecord(raw) : null);
    if (data && (data.member_id != null || data.member_account != null)) {
      return rowToLoaded(data);
    }
  } catch {
    /* memberSelf может отсутствовать на прокси */
  }
  const row = await fetchMemberRowIcafe(params);
  return rowToLoaded(row);
}

/**
 * iCafe Cloud: `PUT /api/v2/cafe/{cafeId}/members/{memberId}`.
 * В теле — в т.ч. `member_oauth_platform` (например `"account"`), поля группы и срока из загруженного профиля.
 */
export async function saveMemberProfile(
  cafeId: number,
  memberId: string,
  fields: EditableMemberFields & { member_birthday_iso: string },
  preserve?: MemberIcafePreserveFields
): Promise<void> {
  const meta: MemberIcafePreserveFields = preserve ?? {
    member_group_id: 0,
    member_oauth_platform: 'account',
    member_is_active: 1,
    member_expire_time_local: '0000-00-00',
  };

  const idInPath = encodeURIComponent(String(memberId).trim());
  const path = `api/v2/cafe/${cafeId}/members/${idInPath}`;
  const session = await getSession();
  const accFromSession = session?.user?.memberAccount?.trim();
  const midTrim = String(memberId).trim();
  const body: Record<string, unknown> = {
    member_id:
      process.env.EXPO_PUBLIC_PUT_MEMBER_ID_AS_NUMBER === '1'
        ? (Number.isFinite(Number(midTrim)) ? Number(midTrim) : midTrim)
        : midTrim,
    member_first_name: fields.member_first_name.trim(),
    member_last_name: fields.member_last_name.trim(),
    member_email: fields.member_email.trim(),
    member_phone: fields.member_phone.trim(),
    member_birthday: fields.member_birthday_iso,
    member_group_id: meta.member_group_id,
    member_is_active: meta.member_is_active,
    member_oauth_platform: meta.member_oauth_platform,
    member_expire_time_local: meta.member_expire_time_local,
  };
  if (accFromSession) {
    body.member_account = accFromSession;
  }
  const raw = await icafePutJsonWithAuth<Record<string, unknown>>(path, body);
  ensureIcafeWriteSuccess(raw);
}

/**
 * Контекст клуба и логина для прокси (как `enrichTopupMemberContext` в memberMoneyApi):
 * без `icafe_id` и согласованного `member_id` шлюз может отвечать 200 без реальной смены пароля.
 */
async function enrichMemberChangePasswordBody(body: Record<string, unknown>, cafeId: number): Promise<void> {
  if (process.env.EXPO_PUBLIC_TOPUP_MINIMAL_BODY === '1') {
    body.icafe_id = cafeId;
    return;
  }
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

function buildMemberIdJsonValue(memberId: string): string | number {
  const midTrim = String(memberId).trim();
  const idNum = Number(midTrim);
  return process.env.EXPO_PUBLIC_PUT_MEMBER_ID_AS_NUMBER === '1'
    ? Number.isFinite(idNum)
      ? idNum
      : midTrim
    : Number.isFinite(idNum)
      ? idNum
      : midTrim;
}

/**
 * Пустой JSON и ответ только с текстом ошибки не считаем успешной сменой пароля.
 */
function ensureMemberChangePasswordResponseOk(raw: Record<string, unknown>): void {
  if (Object.keys(raw).length === 0) {
    throw new ApiError('Пустой ответ API при смене пароля', 200);
  }
  if (typeof raw.code === 'number') {
    ensureIcafePostSuccess(raw);
    return;
  }
  if (typeof raw.message === 'string' && raw.message.trim()) {
    const m = raw.message.trim();
    const low = m.toLowerCase();
    const looksSuccess = low === 'success' || low === 'successful' || low === 'ok';
    if (
      !looksSuccess &&
      /wrong|incorrect|invalid|fail|error|неверн|ошибк|не\s*совпада|неправильн|old\s*password/i.test(m)
    ) {
      throw new ApiError(m, 200);
    }
  }
  ensureIcafeWriteSuccess(raw);
}

/**
 * iCafe Cloud: `POST /api/v2/cafe/{cafeId}/memberChangePassword`.
 * Тело по доке: `member_account`, `account`, `member_id`, `old_password`, `new_password` (последние два обязательны).
 */
export async function changeMemberPassword(
  cafeId: number,
  params: {
    memberId: string;
    memberAccount: string;
    oldPassword: string;
    newPassword: string;
  }
): Promise<void> {
  const path = `api/v2/cafe/${cafeId}/memberChangePassword`;
  const acc = params.memberAccount.trim();

  /** Как в topup: строковый member_id по умолчанию (не число из `buildMemberIdJsonValue`). */
  const member_id = await resolveMemberIdForIcafePostBody(params.memberId);

  const body: Record<string, unknown> = {
    member_account: acc,
    account: acc,
    member_id,
    old_password: params.oldPassword,
    new_password: params.newPassword,
  };

  await enrichMemberChangePasswordBody(body, cafeId);

  const raw = await icafePostJsonWithAuth<Record<string, unknown>>(path, body);
  ensureMemberChangePasswordResponseOk(raw);
}
