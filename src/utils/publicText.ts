import { ApiError } from '../api/client';
import type { MessageKey } from '../i18n/messagesRu';
import { normalizePcZoneKind } from '../features/booking/pcZoneKind';

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function looksTechnicalClubLabel(value: string): boolean {
  const s = normalizeSpaces(value);
  if (!s) return true;
  if (/^(club|клуб)\s*\d+\b/i.test(s)) return true;
  if (/^id\s*[:#-]?\s*\d+\b/i.test(s)) return true;
  if (/^\d+$/.test(s)) return true;
  if (/^[a-z]+[\w-]*\d+$/i.test(s) && !/\s/.test(s)) return true;
  return false;
}

function looksTechnicalErrorMessage(value: string): boolean {
  const low = value.toLowerCase();
  if (!low) return true;
  if (/^(code|код)\s*[:#-]?\s*\d+\b/.test(low)) return true;
  if (/^\d+$/.test(low)) return true;
  if (low.includes('json')) return true;
  if (low.includes('api not allowed')) return true;
  if (low.includes('private_key')) return true;
  if (low.includes('member_id')) return true;
  if (low.includes('encoded_data')) return true;
  if (low.includes('rand_key')) return true;
  if (low.includes('response')) return true;
  if (low.includes('http ') || /^4\d\d\b/.test(low) || /^5\d\d\b/.test(low)) return true;
  if (low.includes('network request failed')) return true;
  if (low.includes('expo_public_')) return true;
  if (low.includes('api_base_url')) return true;
  if (low.includes('в ответе нет')) return true;
  if (low.includes('пустой ответ api')) return true;
  if (low.includes('некорректный json')) return true;
  if (low.includes('ошибка ответа api')) return true;
  if (low.includes('forbidden') || low.includes('not allowed') || low.includes('запрещ')) return true;
  if ((value.includes('{') && value.includes('}')) || (value.includes('[') && value.includes(']'))) return true;
  return false;
}

export function formatPublicClubLabel(args: {
  address?: string | null;
  icafeId?: string | number | null;
  addressById?: Map<number, string>;
  t: Translate;
}): string {
  const fromAddress = normalizeSpaces(String(args.address ?? ''));
  if (fromAddress && !looksTechnicalClubLabel(fromAddress)) return fromAddress;

  if (args.icafeId != null && args.addressById) {
    const n = Number(args.icafeId);
    const mapped = Number.isFinite(n) ? normalizeSpaces(String(args.addressById.get(n) ?? '')) : '';
    if (mapped && !looksTechnicalClubLabel(mapped)) return mapped;
  }

  return args.t('common.yourClub');
}

export function formatPublicPcToken(pcName: string): string {
  const raw = normalizeSpaces(String(pcName ?? ''));
  if (!raw) return '—';

  const noPrefix = raw.replace(/^pc[\s._-]*/i, '').trim();
  const candidate = normalizeSpaces(noPrefix || raw);
  const digits = candidate.match(/\d+/);
  const letters = candidate.replace(/\d+/g, '').replace(/[\s._-]+/g, '');

  if (digits && letters.length <= 3) {
    return String(parseInt(digits[0]!, 10));
  }

  if (/^[\d\s._-]+$/.test(candidate)) {
    return candidate.replace(/[_-]+/g, ' ').trim();
  }

  return candidate;
}

export function formatPublicPcLabel(pcName: string, t: Translate): string {
  return t('booking.userBookingPlace', { name: formatPublicPcToken(pcName) });
}

export function formatPublicPcList(pcNames: string[], t: Translate): string {
  return pcNames.map((name) => formatPublicPcLabel(name, t)).join(', ');
}

export function formatPublicZoneLabel(areaName: string | undefined | null, t: Translate): string {
  const raw = normalizeSpaces(String(areaName ?? ''));
  if (!raw) return t('booking.zoneKindOther');

  const kind = normalizePcZoneKind(raw);
  if (kind === 'VIP') return t('booking.zoneKindVIP');
  if (kind === 'BootCamp') return t('booking.zoneKindBootCamp');
  if (kind === 'GameZone') return t('booking.zoneKindGameZone');

  if (/^\d+$/.test(raw) || /^[a-z0-9_-]{1,16}$/i.test(raw)) {
    return t('booking.zoneKindOther');
  }

  return raw;
}

export function formatPublicErrorMessage(
  error: unknown,
  t: Translate,
  fallbackKey: MessageKey,
): string {
  const fallback = t(fallbackKey);
  const raw =
    error instanceof ApiError
      ? normalizeSpaces(error.message)
      : error instanceof Error
        ? normalizeSpaces(error.message)
        : '';

  if (!raw) return fallback;
  if (looksTechnicalErrorMessage(raw)) return fallback;
  return raw;
}
