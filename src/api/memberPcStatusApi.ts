import { ApiError } from './client';
import { icafeGetJsonWithAuth } from './icafeClient';

export type MemberPcSessionInfo = {
  /** Есть активная сессия на ПК в клубе */
  active: boolean;
  pcName?: string;
  /** Текст для UI (остаток или конец) */
  detailLabel?: string;
};

function unwrap(o: unknown): Record<string, unknown> | null {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const r = o as Record<string, unknown>;
  const data = r.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>;
  return r;
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * GET /api/v2/cafe/{cafeId}/memberPcStatus — «на каком ПК сейчас участник» (iCafe Cloud).
 * Поля в ответе зависят от версии; парсим типичные имена.
 */
export async function fetchMemberPcSessionInfo(
  cafeId: number,
  memberId: string
): Promise<MemberPcSessionInfo> {
  const fallback: MemberPcSessionInfo = { active: false };
  try {
    const raw = await icafeGetJsonWithAuth<unknown>(`api/v2/cafe/${cafeId}/memberPcStatus`, {
      member_id: memberId,
    });
    const o = unwrap(raw) ?? (raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null);
    if (!o) return fallback;

    const pcName = String(
      o.pc_name ?? o.PCName ?? o.member_pc_name ?? o.pcName ?? o.computer_name ?? ''
    ).trim();

    const remain = num(o.remain_minutes ?? o.remaining_minutes ?? o.remain_mins ?? o.left_minutes);
    const activeFlag =
      o.is_active === true ||
      o.session_active === true ||
      o.is_session === true ||
      o.active === 1 ||
      o.active === true;

    const busy =
      o.is_using === true ||
      o.pc_is_busy === true ||
      (typeof o.status === 'string' && /session|active|playing|busy/i.test(o.status));

    const active = busy || activeFlag || (!!pcName && remain != null && remain > 0);

    let detailLabel: string | undefined;
    if (remain != null && remain > 0) {
      detailLabel = `~${Math.ceil(remain)} мин`;
    } else {
      const end = o.end_time ?? o.session_end ?? o.available_to;
      if (typeof end === 'string' && end.trim()) detailLabel = end.trim();
    }

    if (!active && !pcName) return fallback;

    return {
      active: !!active && !!pcName,
      pcName: pcName || undefined,
      detailLabel,
    };
  } catch (e) {
    if (e instanceof ApiError) {
      const m = e.message.toLowerCase();
      if (
        m.includes('not allowed') ||
        m.includes('404') ||
        m.includes('not found') ||
        e.status === 404
      ) {
        return fallback;
      }
    }
    throw e;
  }
}
