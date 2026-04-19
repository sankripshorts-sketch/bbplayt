import { describe, expect, it } from 'vitest';
import type { PriceItem } from '../../src/api/types';
import {
  gameZonePerHourPackageSavingPercent,
  gridGameZoneStickerHoursVsTierLumpPercent,
} from '../../src/features/booking/zoneTariffResolve';

describe('gameZonePerHourPackageSavingPercent', () => {
  it('uses P_база = ставка_за_час × часы: (1 − P_факт/P_база)×100, округление до кратного 5', () => {
    const gz: PriceItem[] = [
      {
        price_id: 1,
        price_name: 'GameZone',
        price_price1: '100.00',
        duration: '60',
        total_price: '100.00',
        group_name: 'GameZone',
      },
    ];
    expect(gameZonePerHourPackageSavingPercent(180, 80, gz)).toBe(75);
  });

  it('matches lump helper for grid rows', () => {
    const gz: PriceItem[] = [
      {
        price_id: 1,
        price_name: 'GameZone',
        price_price1: '100.00',
        duration: '60',
        total_price: '100.00',
        group_name: 'GameZone',
      },
      {
        price_id: 1,
        price_name: 'GameZone',
        price_price1: '100.00',
        duration: '180',
        total_price: '270.00',
        group_name: 'GameZone',
      },
    ];
    const lump = 270;
    expect(gameZonePerHourPackageSavingPercent(180, lump, gz)).toBe(10);
    expect(gridGameZoneStickerHoursVsTierLumpPercent(180, gz)).toBe(10);
  });
});

describe('gridGameZoneStickerHoursVsTierLumpPercent', () => {
  it('returns percent when total_price of long tier is below N×hourly sticker', () => {
    const gz: PriceItem[] = [
      {
        price_id: 1,
        price_name: 'GameZone',
        price_price1: '100.00',
        duration: '60',
        total_price: '100.00',
        group_name: 'GameZone',
      },
      {
        price_id: 1,
        price_name: 'GameZone',
        price_price1: '100.00',
        duration: '180',
        total_price: '270.00',
        group_name: 'GameZone',
      },
    ];
    expect(gridGameZoneStickerHoursVsTierLumpPercent(180, gz)).toBe(10);
  });

  it('returns 0 when lump matches proportional sticker (UI: «Выгоднее на 0%»)', () => {
    const gz: PriceItem[] = [
      {
        price_id: 1,
        price_name: 'GameZone',
        price_price1: '100.00',
        duration: '60',
        total_price: '100.00',
        group_name: 'GameZone',
      },
      {
        price_id: 1,
        price_name: 'GameZone',
        price_price1: '100.00',
        duration: '180',
        total_price: '300.00',
        group_name: 'GameZone',
      },
    ];
    expect(gridGameZoneStickerHoursVsTierLumpPercent(180, gz)).toBe(0);
    expect(gameZonePerHourPackageSavingPercent(180, 300, gz)).toBe(0);
  });
});
