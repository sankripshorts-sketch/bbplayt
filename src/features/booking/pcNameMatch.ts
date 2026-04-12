/**
 * Сопоставление имён ПК из iCafe: `PC09` ↔ `PC9` ↔ `9` (лидирующие нули и префикс PC).
 */
export function pcNumericIndex(raw: string | undefined | null): number | null {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (!d) return null;
  const n = parseInt(d, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function pcNamesLooselyEqual(a: string, b: string): boolean {
  const ta = String(a).trim();
  const tb = String(b).trim();
  if (ta.toLowerCase() === tb.toLowerCase()) return true;
  const na = pcNumericIndex(ta);
  const nb = pcNumericIndex(tb);
  if (na != null && nb != null && na === nb) return true;
  return false;
}
