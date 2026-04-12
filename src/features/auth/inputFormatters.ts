/** Маска российского мобильного: +7 (XXX) XXX-XX-XX; первая цифра номера — сразу (обычно 9). */

export function formatRuPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (!d) return '';

  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7') && d.startsWith('9')) d = '7' + d;
  d = d.slice(0, 11);

  if (!d.startsWith('7')) {
    return d ? `+${d}` : '';
  }

  const r = d.slice(1);
  if (r.length === 0) return '+7';

  let s = '+7 (';
  s += r.slice(0, 3);
  if (r.length <= 3) {
    return r.length === 3 ? `${s}) ` : s;
  }
  s += ') ' + r.slice(3, 6);
  if (r.length <= 6) {
    return s;
  }
  const tail = r.slice(6);
  s += '-';
  s += tail.slice(0, 2);
  if (tail.length <= 2) {
    return s;
  }
  s += '-' + tail.slice(2, 4);
  return s;
}

export function normalizePhoneForApi(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7') && d.startsWith('9')) d = '7' + d;
  d = d.slice(0, 11);
  return `+${d}`;
}

/** Российский мобильный: +7 и далее 9XX (обычно 9 как первая цифра национального номера). */
export function isValidRuMobile(raw: string): boolean {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 11 || !d.startsWith('7')) return false;
  if (d[1] !== '9') return false;
  return true;
}

/**
 * Проверка email: один @, домен с точкой, зона ≥2 букв (не «user@a» без реального TLD).
 */
export function isValidEmailWithRealDomain(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 254) return false;
  const at = s.indexOf('@');
  if (at <= 0 || at !== s.lastIndexOf('@')) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1).toLowerCase();
  if (!local || !domain) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  if (!domain.includes('.')) return false;
  const labels = domain.split('.');
  const tld = labels[labels.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]{2,}$/.test(tld)) return false;
  return /^[^\s@]+$/.test(local);
}

/** ДД.ММ.ГГГГ — точки при вводе, только цифры в значении */
export function formatBirthdayInput(raw: string): string {
  const x = raw.replace(/\D/g, '').slice(0, 8);
  if (x.length <= 2) return x;
  if (x.length <= 4) return `${x.slice(0, 2)}.${x.slice(2)}`;
  return `${x.slice(0, 2)}.${x.slice(2, 4)}.${x.slice(4)}`;
}

export type BirthdayValidation = 'ok' | 'format' | 'invalid';

/** Разбор даты рождения: формат ДД.ММ.ГГГГ и существующий календарный день. */
export function validateBirthdayDdMmYyyy(raw: string): BirthdayValidation {
  const m = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return 'format';
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yyyy = m[3];
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (
    d.getFullYear() !== Number(yyyy) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  ) {
    return 'invalid';
  }
  return 'ok';
}

export function birthdayToIso(raw: string): string | null {
  if (validateBirthdayDdMmYyyy(raw) !== 'ok') return null;
  const m = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

export function parseBirthdayToDate(raw: string): Date {
  const m = raw.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date();
  d.setFullYear(d.getFullYear() - 20);
  return d;
}

export function dateToBirthdayDisplay(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}
