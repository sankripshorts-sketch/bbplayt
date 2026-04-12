import { describe, expect, it } from 'vitest';
import { pcNamesLooselyEqual, pcNumericIndex } from '../../src/features/booking/pcNameMatch';

describe('pcNameMatch', () => {
  it('matches leading zero and PC prefix', () => {
    expect(pcNamesLooselyEqual('PC09', 'PC9')).toBe(true);
    expect(pcNamesLooselyEqual('PC09', '9')).toBe(true);
    expect(pcNamesLooselyEqual('pc09', '09')).toBe(true);
  });

  it('does not confuse different numbers', () => {
    expect(pcNamesLooselyEqual('PC10', 'PC1')).toBe(false);
    expect(pcNamesLooselyEqual('PC19', 'PC9')).toBe(false);
  });

  it('pcNumericIndex', () => {
    expect(pcNumericIndex('PC09')).toBe(9);
    expect(pcNumericIndex('PC10')).toBe(10);
  });
});
