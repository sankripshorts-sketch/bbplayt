import { describe, expect, it } from 'vitest';
import type { PriceItem, ProductItem } from '../../src/api/types';
import {
  gameZonePerHourPackageSavingPercent,
  packageSavingPercentForWheel,
} from '../../src/features/booking/zoneTariffResolve';

describe('packageSavingPercentForWheel baseline vs hourly sticker', () => {
  it('prefers price_price1 over total_price on 60 min row (иначе ~45% при total < ₽/ч×1)', () => {
    const product: ProductItem = {
      product_id: 1,
      product_name: 'GZ 3h',
      product_price: '80',
      group_name: 'GameZone',
      duration_min: '180',
    };
    const prices: PriceItem[] = [
      {
        price_id: 1,
        price_name: 'Default',
        price_price1: '100.00',
        duration: '60',
        total_price: '50.00',
        group_name: 'GameZone',
      },
    ];
    expect(packageSavingPercentForWheel(product, prices, [])).toBe(75);
    expect(gameZonePerHourPackageSavingPercent(180, 80, prices)).toBe(75);
  });

  it('uses ₽/час × часы, not a discounted long-tier average (3 ч за 80 vs 100 ₽/ч → ~75%)', () => {
    const product: ProductItem = {
      product_id: 1,
      product_name: 'GZ 3h',
      product_price: '80',
      group_name: 'GameZone',
      duration_min: '180',
    };
    const prices: PriceItem[] = [
      {
        price_id: 1,
        price_name: 'Default',
        price_price1: '100.00',
        duration: '60',
        total_price: '100.00',
        group_name: 'GameZone',
      },
      {
        price_id: 1,
        price_name: 'Default',
        duration: '120',
        total_price: '100.00',
        group_name: 'GameZone',
      },
    ];
    expect(packageSavingPercentForWheel(product, prices, [])).toBe(75);
  });

  it('when group_name is empty, zone from <<<GZ in product_name still matches GameZone prices (not ~50%)', () => {
    const product: ProductItem = {
      product_id: 3,
      product_name: 'Booking 3 ч <<<GZ',
      product_price: '80',
      duration_min: '180',
    };
    const prices: PriceItem[] = [
      {
        price_id: 1,
        price_name: 'Default',
        price_price1: '100.00',
        duration: '60',
        total_price: '50.00',
        group_name: 'GameZone',
      },
    ];
    expect(packageSavingPercentForWheel(product, prices, [])).toBe(75);
  });

  it('does not use scaled 1h catalog package as baseline when grid has hourly sticker (avoid ~50%)', () => {
    const product: ProductItem = {
      product_id: 10,
      product_name: 'GZ 3h',
      product_price: '80',
      group_name: 'GameZone',
      duration_min: '180',
    };
    const prices: PriceItem[] = [
      {
        price_id: 1,
        price_name: 'Default',
        price_price1: '100.00',
        duration: '60',
        total_price: '100.00',
        group_name: 'GameZone',
      },
    ];
    const catalog: ProductItem[] = [
      { product_id: 1, product_name: '1h', product_price: '50', group_name: 'GameZone', duration_min: '60' },
    ];
    expect(packageSavingPercentForWheel(product, prices, catalog)).toBe(75);
  });

  it('catalog package vs list ₽/ч, not grid lump vs hourly (lump 150 on 180 min row must not yield ~50%)', () => {
    const product: ProductItem = {
      product_id: 12,
      product_name: 'GZ 3h',
      product_price: '80',
      group_name: 'GameZone',
      duration_min: '180',
    };
    const prices: PriceItem[] = [
      {
        price_id: 1,
        price_name: 'GZ',
        price_price1: '100.00',
        duration: '60',
        total_price: '100.00',
        group_name: 'GameZone',
      },
      {
        price_id: 1,
        price_name: 'GZ',
        duration: '180',
        total_price: '150.00',
        group_name: 'GameZone',
      },
    ];
    expect(packageSavingPercentForWheel(product, prices, [])).toBe(75);
  });

  it('5h: ₽/ч × 5 from grid, not catalog 3h price scaled to 5h (avoid ~20%)', () => {
    const product: ProductItem = {
      product_id: 11,
      product_name: 'GZ 5h',
      product_price: '100',
      group_name: 'GameZone',
      duration_min: '300',
    };
    const prices: PriceItem[] = [
      {
        price_id: 1,
        price_name: 'Default',
        price_price1: '100.00',
        duration: '60',
        total_price: '100.00',
        group_name: 'GameZone',
      },
    ];
    const catalog: ProductItem[] = [
      { product_id: 2, product_name: '3h', product_price: '750', group_name: 'GameZone', duration_min: '180' },
    ];
    expect(packageSavingPercentForWheel(product, prices, catalog)).toBe(80);
  });

  it('live-style GZ: 50 ₽ / 99 ₽ packages vs 100 ₽/ч → 83.33% / 80.2% raw → 85% UI', () => {
    const gzRow = {
      price_id: 77289,
      price_name: 'GameZone',
      price_price1: '100.00',
      duration: '60',
      total_price: '100.00',
      group_name: 'GameZone',
    };
    const p3: ProductItem = {
      product_id: 1591251485,
      product_name: '3ч<<<GZ',
      product_price: '50',
      duration_min: '180',
      group_name: 'GameZone',
    };
    const p5: ProductItem = {
      product_id: 1591251487,
      product_name: '5ч<<<GZ',
      product_price: '99',
      duration_min: '300',
      group_name: 'GameZone',
    };
    const prices: PriceItem[] = [
      gzRow,
      { ...gzRow, duration: '180', total_price: '300.00' },
      { ...gzRow, duration: '300', total_price: '500.00' },
    ];
    expect(packageSavingPercentForWheel(p3, prices, [])).toBe(85);
    expect(packageSavingPercentForWheel(p5, prices, [])).toBe(85);
  });

  it('same percent for VIP and GameZone package row when catalog has both (display from GZ only)', () => {
    const gzRow = {
      price_id: 1,
      price_name: 'GZ',
      price_price1: '100.00',
      duration: '60',
      total_price: '100.00',
      group_name: 'GameZone',
    };
    const prices: PriceItem[] = [gzRow];
    const catalog: ProductItem[] = [
      {
        product_id: 1,
        product_name: '3ч<<<GZ',
        product_price: '80',
        duration_min: '180',
        group_name: 'GameZone',
      },
      {
        product_id: 2,
        product_name: '3ч<<<VP',
        product_price: '200',
        duration_min: '180',
        group_name: 'VIP',
      },
    ];
    const vip: ProductItem = catalog[1]!;
    const gz: ProductItem = catalog[0]!;
    expect(packageSavingPercentForWheel(vip, prices, catalog)).toBe(75);
    expect(packageSavingPercentForWheel(gz, prices, catalog)).toBe(75);
  });

  it('among several 60 min rows takes max ₽/ч as baseline', () => {
    const product: ProductItem = {
      product_id: 4,
      product_name: 'x <<<GZ',
      product_price: '80',
      duration_min: '180',
    };
    const prices: PriceItem[] = [
      {
        price_id: 2,
        price_name: 'Promo',
        price_price1: '50.00',
        duration: '60',
        total_price: '50.00',
        group_name: 'GameZone',
      },
      {
        price_id: 3,
        price_name: 'Standard',
        price_price1: '100.00',
        duration: '60',
        total_price: '100.00',
        group_name: 'GameZone',
      },
    ];
    expect(packageSavingPercentForWheel(product, prices, [])).toBe(75);
  });
});
