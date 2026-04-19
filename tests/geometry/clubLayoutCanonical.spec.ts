import { describe, expect, it } from 'vitest';
import { computeCanonicalZoneFrames, getResponsiveCanonicalSpacing } from '../../src/config/clubLayoutConfig';
import type { StructRoom } from '../../src/api/types';

function room(name: string, ax: number, ay: number, aw: number, bottomY: number): StructRoom {
  return {
    area_name: name,
    area_frame_x: ax,
    area_frame_y: ay,
    area_frame_width: aw,
    area_frame_height: bottomY,
    pcs_list: [],
  };
}

describe('computeCanonicalZoneFrames', () => {
  it('places BootCamp left, GameZone center, VIP right with gaps', () => {
    const tweak = {
      canonicalColumns: {
        enabled: true,
        paddingPx: 10,
        columnGapPx: 8,
        sideWidthFraction: 0.2,
        topInsetPx: 4,
      },
      zoneOffsets: {},
      zoneSizeXY: {},
      zonePosXY: {},
      pcOffsets: {},
      pcXY: {},
      pcScale: {},
    };
    const rooms: StructRoom[] = [
      room('BootCamp', 999, 0, 100, 300),
      room('GameZone', 5000, 0, 400, 280),
      room('VIP', 9000, 0, 100, 300),
    ];
    const out = computeCanonicalZoneFrames(rooms, 400, 200, tweak);
    expect(out).not.toBeNull();
    const sp = getResponsiveCanonicalSpacing(400, tweak.canonicalColumns!);
    const [b, g, v] = out!.frames;
    expect(b.left).toBeLessThan(g.left);
    expect(g.left + g.w + sp.gap).toBeLessThanOrEqual(v.left + 0.5);
    expect(b.w).toBeCloseTo(v.w, 5);
    expect(g.w).toBeGreaterThan(b.w);
    const maxBottom = Math.max(...out!.frames.map((f) => f.top + f.h));
    expect(out!.canvasH).toBeCloseTo(maxBottom + sp.bottomInset, 5);
    /** Верхи зон на одной линии (как flex-start в HTML-макете). */
    expect(b.top).toBeCloseTo(g.top, 5);
    expect(g.top).toBeCloseTo(v.top, 5);
    /** GameZone — квадрат: высота = ширине рамки. */
    expect(g.h).toBeCloseTo(g.w, 5);
  });

  it('returns null when canonical disabled', () => {
    const tweak = {
      canonicalColumns: { enabled: false },
      zoneOffsets: {},
      zoneSizeXY: {},
      zonePosXY: {},
      pcOffsets: {},
      pcXY: {},
      pcScale: {},
    };
    expect(computeCanonicalZoneFrames([room('BootCamp', 0, 0, 100, 200)], 300, 200, tweak)).toBeNull();
  });
});
