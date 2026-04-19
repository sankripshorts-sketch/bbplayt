import { describe, expect, it } from 'vitest';
import { normalizeAvailablePcsData } from '../../src/api/normalizeAvailablePcs';

describe('normalizeAvailablePcsData', () => {
  it('parses string booleans for is_using correctly', () => {
    const data = normalizeAvailablePcsData({
      data: {
        pc_list: [
          { pc_name: 'PC-1', is_using: '0' },
          { pc_name: 'PC-2', is_using: '1' },
        ],
      },
    });

    expect(data.pc_list).toHaveLength(2);
    expect(data.pc_list[0]?.is_using).toBe(false);
    expect(data.pc_list[1]?.is_using).toBe(true);
  });

  it('prefers is_available over is_using even when strings', () => {
    const data = normalizeAvailablePcsData({
      data: {
        pc_list: [
          { pc_name: 'PC-1', is_using: '1', is_available: '1' },
          { pc_name: 'PC-2', is_using: '0', is_available: '0' },
        ],
      },
    });

    expect(data.pc_list).toHaveLength(2);
    expect(data.pc_list[0]?.is_using).toBe(false);
    expect(data.pc_list[1]?.is_using).toBe(true);
  });
});
