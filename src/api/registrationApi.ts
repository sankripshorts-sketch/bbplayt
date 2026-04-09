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

function smsPath(): string {
  const p = process.env.EXPO_PUBLIC_REQUEST_SMS_PATH?.trim();
  return p || 'requestsms';
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
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

/** POST requestsms (или EXPO_PUBLIC_REQUEST_SMS_PATH) */
export async function requestMemberSms(memberId: string, memberPhone: string): Promise<RequestSmsResult> {
  const path = smsPath();
  const raw = await icafePostJson<Record<string, unknown>>(path, {
    member_id: memberId,
    member_phone: memberPhone,
  });

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
