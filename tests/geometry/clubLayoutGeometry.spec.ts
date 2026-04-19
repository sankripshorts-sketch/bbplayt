import { describe, expect, it } from 'vitest';
import {
  coerceAxisToZoneLocal,
  formatPcLabelForHallMap,
  pcOffsetsInZonePixels,
  PC_CHIP_LAYOUT_UNITS,
} from '../../src/features/cafes/clubLayoutGeometry';
import type { StructPc } from '../../src/api/types';

function pc(left: number, top: number, name = 'PC01'): StructPc {
  return { pc_name: name, pc_box_left: left, pc_box_top: top };
}

describe('pcOffsetsInZonePixels', () => {
  const zoneW = 200;
  const zoneH = 400;
  const pxW = 200;
  const pxH = 400;

  it('centers relative coordinates (legacy)', () => {
    const out = pcOffsetsInZonePixels([pc(0, 0), pc(0, 80)], zoneW, zoneH, pxW, pxH, 0);
    expect(out).toHaveLength(2);
    const sx = pxW / zoneW;
    const midX = (zoneW - PC_CHIP_LAYOUT_UNITS) / 2 * sx;
    expect(out[0]!.left).toBeCloseTo(midX, 5);
  });

  it('subtracts world origin when pc_box overflows area width', () => {
    const ax = 400;
    const ay = 100;
    const out = pcOffsetsInZonePixels(
      [pc(420, 120, 'PC09'), pc(420, 200, 'PC10')],
      zoneW,
      zoneH,
      pxW,
      pxH,
      0,
      ax,
      ay,
    );
    expect(out).toHaveLength(2);
    const sx = pxW / zoneW;
    const relLeft = 20;
    const offsetX = (zoneW - PC_CHIP_LAYOUT_UNITS) / 2 - relLeft;
    expect(out[0]!.left).toBeCloseTo((relLeft + offsetX) * sx, 5);
  });

  it('does not subtract when coordinates stay within area width (relative)', () => {
    const ax = 100;
    const out = pcOffsetsInZonePixels([pc(50, 30)], zoneW, zoneH, pxW, pxH, 0, ax, 0);
    const sx = pxW / zoneW;
    const offsetX = (zoneW - PC_CHIP_LAYOUT_UNITS) / 2 - 50;
    expect(out[0]!.left).toBeCloseTo((50 + offsetX) * sx, 5);
  });

  it('keeps PC chips square when zone maps with different sx and sy', () => {
    const out = pcOffsetsInZonePixels([pc(0, 0)], zoneW, zoneH, 160, 400, 0);
    expect(out).toHaveLength(1);
    const sx = 160 / zoneW;
    const sy = 400 / zoneH;
    const u = Math.min(sx, sy);
    expect(out[0]!.chipW).toBeCloseTo(PC_CHIP_LAYOUT_UNITS * u, 5);
    expect(out[0]!.chipH).toBeCloseTo(PC_CHIP_LAYOUT_UNITS * u, 5);
    expect(out[0]!.chipW).toBeCloseTo(out[0]!.chipH, 5);
  });

  it('plan-absolute PCs when area_frame_x is 0: strips min so cluster fits zone', () => {
    const out = pcOffsetsInZonePixels(
      [pc(500, 600, 'PC01'), pc(620, 720, 'PC02')],
      zoneW,
      zoneH,
      pxW,
      pxH,
      0,
      0,
      0,
    );
    expect(out).toHaveLength(2);
    const sx = pxW / zoneW;
    const rel0 = 0;
    const rel1 = 120;
    const offsetX = (zoneW - (rel1 - rel0 + PC_CHIP_LAYOUT_UNITS)) / 2 - rel0;
    expect(out[0]!.left).toBeCloseTo((rel0 + offsetX) * sx, 5);
  });
});

describe('formatPcLabelForHallMap', () => {
  it('strips PC prefix and leading zeros in numeric labels', () => {
    expect(formatPcLabelForHallMap('PC9')).toBe('9');
    expect(formatPcLabelForHallMap('PC09')).toBe('9');
    expect(formatPcLabelForHallMap('pc 12')).toBe('12');
  });
});

describe('coerceAxisToZoneLocal', () => {
  it('prefers subtracting frame origin when raw overflows but shifted fits', () => {
    expect(coerceAxisToZoneLocal([520, 540], 500, 200, 3)).toEqual([20, 40]);
  });

  it('uses min-shift when frame is 0 but values are plan-absolute', () => {
    expect(coerceAxisToZoneLocal([500, 620], 0, 200, 3)).toEqual([0, 120]);
  });

  it('leaves already-local coordinates unchanged', () => {
    expect(coerceAxisToZoneLocal([10, 90], 400, 200, 3)).toEqual([10, 90]);
  });
});
