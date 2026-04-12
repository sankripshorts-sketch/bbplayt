import { describe, expect, it } from 'vitest';
import type { PriceItem } from '../../src/api/types';
import { parseMinsFromPriceItem } from '../../src/features/booking/tariffSelection';

function row(duration: string): PriceItem {
  return { price_id: 1, price_name: 'T', duration };
}

describe('parseMinsFromPriceItem', () => {
  it('treats plain 1 as 60 minutes (1 hour in iCafe configs)', () => {
    expect(parseMinsFromPriceItem(row('1'), 0)).toBe(60);
  });

  it('keeps 30 / 60 / 90 as minutes', () => {
    expect(parseMinsFromPriceItem(row('30'), 0)).toBe(30);
    expect(parseMinsFromPriceItem(row('60'), 0)).toBe(60);
    expect(parseMinsFromPriceItem(row('90'), 0)).toBe(90);
  });

  it('treats 2..6 as hours when digit-only', () => {
    expect(parseMinsFromPriceItem(row('2'), 0)).toBe(120);
    expect(parseMinsFromPriceItem(row('3'), 0)).toBe(180);
  });
});
