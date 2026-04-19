import type { IcafeProxyResponse, MemberCreatedData } from './icafeClient';
import {
  assertIcafeSuccess,
  extractMemberId,
  icafePostJson,
} from './icafeClient';
import { ApiError } from './client';
import type { VibeEnvelope } from './types';
import { buildVerifySmsKey, randomNumericKey } from './verifyKey';

export type RegistrationBody = {
  member_account: string;
  member_first_name: string;
  member_last_name: string;
  member_email: string;
  /** YYYY-MM-DD */
  member_birthday: string;
  member_phone: string;
  member_password: string;
  member_confirm: string;
};

/** Как в официальной доке iCafe Cloud; часть клиентов использует base URL без дефиса. */
const SMS_PATH_DOC = 'request-sms';
const SMS_PATH_LEGACY = 'requestsms';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * Порядок попыток POST запроса SMS (при 404 на первом пути — следующий).
 * Если задан `EXPO_PUBLIC_REQUEST_SMS_PATH`, он идёт первым, затем оба канонических варианта.
 */
export function requestSmsPathCandidates(): string[] {
  const explicit = process.env.EXPO_PUBLIC_REQUEST_SMS_PATH?.trim();
  const canonical = [SMS_PATH_DOC, SMS_PATH_LEGACY];
  if (explicit) {
    const rest = canonical.filter((p) => p !== explicit);
    return [...new Set([explicit, ...rest])];
  }
  return [...canonical];
}

/**
 * По умолчанию `{ member_id, member_phone }` (совместимо с большинством прокси).
 * Строго по доке iCafe (только `member_id`): `EXPO_PUBLIC_REQUEST_SMS_INCLUDE_PHONE=0`
 */
function buildRequestSmsBody(memberId: string, memberPhone: string): Record<string, string> {
  const minimal =
    process.env.EXPO_PUBLIC_REQUEST_SMS_INCLUDE_PHONE === '0' ||
    process.env.EXPO_PUBLIC_REQUEST_SMS_INCLUDE_PHONE === 'false';
  if (minimal) {
    return { member_id: memberId };
  }
  return { member_id: memberId, member_phone: memberPhone };
}

/** POST api/v2/cafe/:cafeId/members */
export async function createMember(
  cafeId: number,
  body: RegistrationBody
): Promise<{ memberId: string; privateKey: string }> {
  const path = `api/v2/cafe/${cafeId}/members`;
  const raw = await icafePostJson<Record<string, unknown>>(path, body);

  if (raw.code === 0 && raw.data !== undefined) {
    const env = raw as unknown as VibeEnvelope<MemberCreatedData & Record<string, unknown>>;
    const data = asRecord(env.data) ?? {};
    const memberId =
      extractMemberId(env.data as MemberCreatedData) ??
      (typeof data.member_id === 'number' || typeof data.member_id === 'string'
        ? String(data.member_id)
        : null);
    const privateKey =
      (typeof raw.private_key === 'string' && raw.private_key) ||
      (typeof data.private_key === 'string' && data.private_key) ||
      '';
    if (memberId && privateKey) return { memberId, privateKey };
    if (memberId && !privateKey) {
      throw new ApiError('В ответе нет private_key (нужен для verify)', 200);
    }
  }

  const parsed = raw as unknown as IcafeProxyResponse<MemberCreatedData>;
  assertIcafeSuccess(parsed);
  const memberId = extractMemberId(parsed.data);
  if (!memberId) {
    throw new ApiError('В ответе нет member_id', 200);
  }
  const privateKey = parsed.private_key ?? '';
  if (!privateKey) {
    throw new ApiError('В ответе нет private_key (нужен для verify)', 200);
  }
  return { memberId, privateKey };
}

export type RequestSmsResult = {
  encodedData: string;
  nextRequestSmsTime: number;
};

function parseRequestSmsResponse(raw: Record<string, unknown>): RequestSmsResult {
  if (raw.code === 429) {
    throw new ApiError(String(raw.message ?? 'Слишком частые запросы SMS'), 200, { code: 429 });
  }

  if (raw.code === 0) {
    const inner = asRecord(raw.data);
    const encoded =
      (typeof raw.encoded_data === 'string' && raw.encoded_data) ||
      (inner && typeof inner.encoded_data === 'string' ? inner.encoded_data : '');
    const nextRaw = raw.next_request_sms_time ?? inner?.next_request_sms_time;
    const next = nextRaw !== undefined && nextRaw !== null ? Number(nextRaw) : NaN;
    if (encoded && !Number.isNaN(next)) {
      return { encodedData: encoded, nextRequestSmsTime: next };
    }
  }

  const parsed = raw as unknown as IcafeProxyResponse;
  assertIcafeSuccess(parsed);
  const encoded = parsed.encoded_data;
  const next = parsed.next_request_sms_time;
  if (!encoded || next === undefined || next === null) {
    throw new ApiError('Нет encoded_data или next_request_sms_time в ответе', 200);
  }
  return { encodedData: encoded, nextRequestSmsTime: Number(next) };
}

/**
 * POST `request-sms` / `requestsms` (или `EXPO_PUBLIC_REQUEST_SMS_PATH`).
 * При HTTP 404 на одном пути выполняется запрос на альтернативный (разные прокси/iCafe).
 */
export async function requestMemberSms(memberId: string, memberPhone: string): Promise<RequestSmsResult> {
  const body = buildRequestSmsBody(memberId, memberPhone);
  const paths = requestSmsPathCandidates();
  let lastErr: unknown;

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]!;
    try {
      const raw = await icafePostJson<Record<string, unknown>>(path, body);
      return parseRequestSmsResponse(raw);
    } catch (e) {
      lastErr = e;
      const is404 = e instanceof ApiError && e.status === 404;
      if (is404 && i < paths.length - 1) continue;
      throw e;
    }
  }

  if (lastErr instanceof Error) throw lastErr;
  throw new ApiError('Не удалось запросить SMS', 0);
}

/** POST verify */
export async function verifyMemberSms(params: {
  memberId: string;
  privateKey: string;
  encodedData: string;
  code: string;
}): Promise<void> {
  const rand_key = randomNumericKey();
  const key = await buildVerifySmsKey({
    memberId: params.memberId,
    randKey: rand_key,
    privateKey: params.privateKey,
  });
  const raw = await icafePostJson<Record<string, unknown>>('verify', {
    member_id: params.memberId,
    encoded_data: params.encodedData,
    code: params.code.trim(),
    rand_key,
    key,
  });
  if (raw.code === 409) {
    throw new ApiError(String(raw.message ?? 'Неверный код'), 200, { code: 409 });
  }
  if (raw.code === 0) return;
  const parsed = raw as unknown as IcafeProxyResponse;
  assertIcafeSuccess(parsed);
}
