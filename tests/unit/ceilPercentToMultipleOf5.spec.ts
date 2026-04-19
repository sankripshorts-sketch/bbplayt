import { describe, expect, it } from 'vitest';
import { ceilPercentToMultipleOf5, roundPercentNearestMultipleOf5 } from '../../src/features/booking/zoneTariffResolve';

describe('ceilPercentToMultipleOf5', () => {
  it('rounds up to a multiple of 5 (73,3% → 75%)', () => {
    expect(ceilPercentToMultipleOf5(73.3)).toBe(75);
    expect(ceilPercentToMultipleOf5(12)).toBe(15);
    expect(ceilPercentToMultipleOf5(13)).toBe(15);
    expect(ceilPercentToMultipleOf5(10)).toBe(10);
    expect(ceilPercentToMultipleOf5(2)).toBe(5);
  });

  it('returns 0 for non-positive or non-finite input', () => {
    expect(ceilPercentToMultipleOf5(0)).toBe(0);
    expect(ceilPercentToMultipleOf5(-3)).toBe(0);
    expect(ceilPercentToMultipleOf5(Number.NaN)).toBe(0);
  });

  it('deprecated alias matches', () => {
    expect(roundPercentNearestMultipleOf5(73.3)).toBe(ceilPercentToMultipleOf5(73.3));
  });
});
