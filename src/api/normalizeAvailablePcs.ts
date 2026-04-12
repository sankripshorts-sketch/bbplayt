import type { AvailablePcsData, PcListItem } from './types';

function coerceStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

function normalizePc(raw: unknown): PcListItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const pc_name = coerceStr(o.pc_name);
  if (!pc_name) return null;

  const groupName = coerceStr(
    o.pc_group_name ?? o.pc_price_group ?? o.price_pc_group ?? o.pcGroupName ?? o.pc_group,
  );
  const areaFromFields = coerceStr(o.pc_area_name ?? o.pc_area);
  const pc_area = coerceStr(o.pc_area);
  const pc_area_name = (areaFromFields ?? groupName ?? pc_area ?? '').trim() || '';

  let is_using = Boolean(o.is_using);
  if (typeof o.is_available === 'boolean') {
    is_using = !o.is_available;
  }

  const row: PcListItem = {
    pc_name,
    pc_area_name,
    ...(groupName ? { pc_group_name: groupName } : {}),
    ...(pc_area && pc_area !== pc_area_name ? { pc_area } : {}),
    pc_icafe_id:
      typeof o.pc_icafe_id === 'number'
        ? o.pc_icafe_id
        : typeof o.pc_icafe_id === 'string'
          ? Number(o.pc_icafe_id) || 0
          : 0,
    price_name: coerceStr(o.price_name),
    is_using,
    start_date: o.start_date != null ? coerceStr(o.start_date) ?? null : null,
    start_time: o.start_time != null ? coerceStr(o.start_time) ?? null : null,
    end_date: o.end_date != null ? coerceStr(o.end_date) ?? null : null,
    end_time: o.end_time != null ? coerceStr(o.end_time) ?? null : null,
  };
  return row;
}

/**
 * vibe/iCafe: обычно `data.pc_list` + `pc_area_name` / `is_using`;
 * по доке конкурса также бывает `pcs`, `pc_area`, `is_available`.
 */
export function normalizeAvailablePcsData(raw: unknown): AvailablePcsData {
  const empty: AvailablePcsData = { pc_list: [] };
  if (raw == null) return empty;

  let root: Record<string, unknown> | null = null;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    root = raw as Record<string, unknown>;
  }
  if (!root) return empty;

  const inner = root.data && typeof root.data === 'object' && !Array.isArray(root.data) ? root.data : null;
  const bag = (inner ?? root) as Record<string, unknown>;

  const listRaw =
    bag['pc_list'] ??
    bag['pcs'] ??
    (inner && typeof inner === 'object' && 'pcs' in inner ? (inner as Record<string, unknown>)['pcs'] : undefined);

  const pc_list: PcListItem[] = [];
  if (Array.isArray(listRaw)) {
    for (const x of listRaw) {
      const p = normalizePc(x);
      if (p) pc_list.push(p);
    }
  }

  const time_frame = coerceStr(bag['time_frame'] ?? root['time_frame']);

  return {
    ...(time_frame ? { time_frame } : {}),
    pc_list,
  };
}
