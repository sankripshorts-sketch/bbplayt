import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function parseLocalStart(dateISO: string, timeHHmm: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  const parts = timeHHmm.split(':').map(Number);
  const hh = parts[0] ?? 0;
  const mm = parts[1] ?? 0;
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh, mm, 0, 0);
}

/** Только Android: создать локальный календарь, если нет доступного для записи. */
async function ensureBbplayCalendarId(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  const title = 'BBplay';
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = cals.find((c) => c.allowsModifications && c.title === title);
  if (existing?.id) return existing.id;
  try {
    const id = await Calendar.createCalendarAsync({
      title,
      color: '#6C5CE7',
      entityType: Calendar.EntityTypes.EVENT,
      source: {
        isLocalAccount: true,
        name: 'BBplay',
        type: Calendar.SourceType.LOCAL,
      },
      name: title,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    return id;
  } catch (e) {
    if (__DEV__) console.warn('[deviceCalendar] createCalendarAsync', String(e));
    return null;
  }
}

async function resolveWritableCalendarId(): Promise<string | null> {
  if (Platform.OS === 'ios') {
    try {
      const def = await Calendar.getDefaultCalendarAsync();
      if (def?.id && def.allowsModifications) return def.id;
    } catch {
      /* fall through */
    }
  }
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = cals.filter((c) => c.allowsModifications);
  const primary = writable.find((c) => c.isPrimary) ?? writable[0];
  if (primary?.id) return primary.id;
  if (Platform.OS === 'android') {
    const created = await ensureBbplayCalendarId();
    if (created) return created;
  }
  return cals[0]?.id ?? null;
}

export async function ensureCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Calendar.requestCalendarPermissionsAsync();
  return req.status === 'granted';
}

export type BookingCalendarPayload = {
  title: string;
  location: string;
  notes: string;
  dateStart: string;
  timeStart: string;
  durationMins: number;
  /** Если задано (например момент начала слота по МСК из API), используется вместо локального разбора даты/времени */
  startDate?: Date;
};

/** Возвращает id события или null при отказе / ошибке. */
export async function addBookingEventToCalendar(payload: BookingCalendarPayload): Promise<string | null> {
  const ok = await ensureCalendarPermission();
  if (!ok) return null;
  const calendarId = await resolveWritableCalendarId();
  if (!calendarId) return null;
  const start = payload.startDate ?? parseLocalStart(payload.dateStart, payload.timeStart);
  const end = new Date(start.getTime() + Math.max(1, payload.durationMins) * 60 * 1000);
  const tz = deviceTimeZone();
  try {
    const id = await Calendar.createEventAsync(calendarId, {
      title: payload.title,
      startDate: start,
      endDate: end,
      location: payload.location,
      notes: payload.notes,
      ...(tz ? { timeZone: tz } : {}),
    });
    return id;
  } catch (e) {
    if (__DEV__) console.warn('[deviceCalendar] createEventAsync', String(e));
    return null;
  }
}
