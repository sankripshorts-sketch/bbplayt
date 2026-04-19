import { describe, expect, it } from 'vitest';
import type { PriceItem } from '../../src/api/types';
import {
  bookingPackageWheelDisplayMins,
  catalogProductSessionMins,
  dedupeBookingWheelPackagesByDuration,
  distinctPackageTierMinutesFromPrices,
  filterBookingWheelPackageProducts,
  isCatalogSessionPackageWheelProduct,
  packageBenefitTextFromProduct,
  parseMinsFromPriceItem,
  productZoneLabelForUi,
} from '../../src/features/booking/tariffSelection';
import { mergeBookingProductsCatalog } from '../../src/api/cafeBookingProducts';
import type { ProductItem } from '../../src/api/types';

function row(duration: string): PriceItem {
  return { price_id: 1, price_name: 'T', duration };
}

describe('catalogProductSessionMins (server products)', () => {
  it('reads minutes from duration string', () => {
    const p: ProductItem = { product_id: 1, product_name: 'P', duration: '210' };
    expect(catalogProductSessionMins(p)).toBe(210);
  });

  it('reads hours from digit 3 as 180 min', () => {
    const p: ProductItem = { product_id: 1, product_name: 'P', duration: '3' };
    expect(catalogProductSessionMins(p)).toBe(180);
  });

  it('reads minutes from <<<180>>> / <<<300>>> in product_name when duration omitted', () => {
    expect(
      catalogProductSessionMins({
        product_id: 1,
        product_name: 'Booking · <<<180>>> · zone',
      }),
    ).toBe(180);
    expect(
      catalogProductSessionMins({
        product_id: 2,
        product_name: '<<<300>>>',
      }),
    ).toBe(300);
  });

  it('reads minutes from broken <<<180<<< marker', () => {
    expect(
      catalogProductSessionMins({
        product_id: 1,
        product_name: 'Пакет <<<180<<< фрагмент',
      }),
    ).toBe(180);
  });

  it('prefers hours in product_name when angle markers duplicate (iCafe 3ч vs 5ч)', () => {
    const suffix = '<<<180<<<180<<<1|2|3|4|5|6|7<<<00:00-23:59<<<GZ';
    expect(
      catalogProductSessionMins({
        product_id: 1,
        product_name: `3 часа/пакет${suffix}`,
      }),
    ).toBe(180);
    expect(
      catalogProductSessionMins({
        product_id: 2,
        product_name: `5 часов/пакет${suffix}`,
      }),
    ).toBe(300);
  });

  it('prefers «N часа/часов» in title over erroneous duration_min (e.g. 60 from iCafe)', () => {
    const suffix = '<<<180<<<180<<<GZ';
    expect(
      catalogProductSessionMins({
        product_id: 1,
        product_name: `5 часов/пакет${suffix}`,
        duration_min: '60',
      }),
    ).toBe(300);
    expect(
      catalogProductSessionMins({
        product_id: 2,
        product_name: `3 часа/пакет${suffix}`,
        duration_min: '60',
      }),
    ).toBe(180);
  });

  it('reads hours from <<<5>>> / <<<3>>> (minutes marker requires 2+ digits historically)', () => {
    expect(
      catalogProductSessionMins({
        product_id: 1,
        product_name: 'Пакет <<<5>>>',
      }),
    ).toBe(300);
    expect(
      catalogProductSessionMins({
        product_id: 2,
        product_name: '<<<3>>>',
      }),
    ).toBe(180);
  });
});

describe('isCatalogSessionPackageWheelProduct', () => {
  it('includes long packages', () => {
    const p: ProductItem = { product_id: 1, product_name: 'Ночь', duration: '3' };
    expect(isCatalogSessionPackageWheelProduct(p)).toBe(true);
  });

  it('includes 60 min package when server does not mark hourly duplicate', () => {
    const p: ProductItem = {
      product_id: 2,
      product_name: 'Пакет 1 ч',
      duration: '60',
      is_calc_duration: false,
    };
    expect(isCatalogSessionPackageWheelProduct(p)).toBe(true);
  });

  it('includes 60 min when is_calc_duration omitted', () => {
    const p: ProductItem = { product_id: 2, product_name: 'Акция 1 ч', duration: '60' };
    expect(isCatalogSessionPackageWheelProduct(p)).toBe(true);
  });

  it('still includes 60 min when is_calc_duration is true (iCafe often sets it on all rows)', () => {
    const p: ProductItem = {
      product_id: 2,
      product_name: 'X',
      duration: '60',
      is_calc_duration: true,
    };
    expect(isCatalogSessionPackageWheelProduct(p)).toBe(true);
  });

  it('excludes top-up products', () => {
    const p: ProductItem = { product_id: 9, product_name: 'Пополнение', duration: '60' };
    expect(isCatalogSessionPackageWheelProduct(p)).toBe(false);
  });
});

describe('distinctPackageTierMinutesFromPrices', () => {
  it('adds long tiers from prices grid when products catalog is empty (vibe sample)', () => {
    const prices = [
      { price_id: 1, price_name: 'G', duration: '30' },
      { price_id: 1, price_name: 'G', duration: '180' },
      { price_id: 1, price_name: 'G', duration: '300' },
    ];
    expect(distinctPackageTierMinutesFromPrices(prices, [30, 60, 90, 120])).toEqual([180, 300]);
  });
});

describe('packageBenefitTextFromProduct', () => {
  it('prefers package_hint', () => {
    const p: ProductItem = {
      product_id: 1,
      product_name: 'Long name',
      package_hint: 'Выгода 15%',
    };
    expect(packageBenefitTextFromProduct(p)).toBe('Выгода 15%');
  });

  it('extracts <<<…>>> fragments from product_name', () => {
    const p: ProductItem = {
      product_id: 1,
      product_name: 'Пакет <<<180>>> · <<<−10% к почасовке>>>',
    };
    expect(packageBenefitTextFromProduct(p)).toBe('180 · −10% к почасовке');
  });
});

describe('filterBookingWheelPackageProducts', () => {
  it('drops 30–120 min rows so hourly presets are not duplicated as packages', () => {
    const list: ProductItem[] = [
      { product_id: 1, product_name: 'Лишний', duration: '60' },
      { product_id: 2, product_name: '3ч', duration: '180' },
    ];
    expect(filterBookingWheelPackageProducts(list)).toHaveLength(1);
    expect(filterBookingWheelPackageProducts(list)[0]!.product_id).toBe(2);
  });
});

describe('productZoneLabelForUi / bookingPackageWheelDisplayMins', () => {
  it('maps <<<BC|GZ|VP tail when group_name is missing', () => {
    expect(
      productZoneLabelForUi({
        product_id: 1,
        product_name: '3 часа/пакет<<<00:00-23:59<<<BC',
      }),
    ).toBe('BootCamp');
    expect(
      productZoneLabelForUi({
        product_id: 2,
        product_name: '3 часа/пакет<<<GZ',
      }),
    ).toBe('GameZone');
  });

  it('uses bookingPackageWheelDisplayMins from catalog when duration field disagrees', () => {
    const p: ProductItem = {
      product_id: 1,
      /** Без поля duration: как в iCafe, только имя + маркеры — каталог даёт 5 ч, parseMinsFromProduct по имени мог бы ошибиться. */
      product_name: '5 часов/пакет<<<180<<<180<<<GZ',
    };
    expect(bookingPackageWheelDisplayMins(p, 0)).toBe(300);
  });
});

describe('dedupeBookingWheelPackagesByDuration', () => {
  it('keeps one package per duration, prefers GameZone when zone not specified', () => {
    const list: ProductItem[] = [
      { product_id: 1, product_name: 'VIP 3h', duration: '180', group_name: 'VIP' },
      { product_id: 2, product_name: 'GZ 3h', duration: '180', group_name: 'GameZone' },
      { product_id: 3, product_name: 'BC 3h', duration: '180', group_name: 'BootCamp' },
      { product_id: 4, product_name: 'GZ 5h', duration: '300', group_name: 'GameZone' },
      { product_id: 5, product_name: 'VIP 5h', duration: '300', group_name: 'VIP' },
    ];
    const d = dedupeBookingWheelPackagesByDuration(list);
    expect(d).toHaveLength(2);
    expect(d.find((p) => p.product_id === 2)).toBeTruthy();
    expect(d.find((p) => p.product_id === 4)).toBeTruthy();
  });

  it('picks package for preferred PC zone (VIP)', () => {
    const list: ProductItem[] = [
      { product_id: 1, product_name: 'VIP 3h', duration: '180', group_name: 'VIP' },
      { product_id: 2, product_name: 'GZ 3h', duration: '180', group_name: 'GameZone' },
      { product_id: 4, product_name: 'GZ 5h', duration: '300', group_name: 'GameZone' },
      { product_id: 5, product_name: 'VIP 5h', duration: '300', group_name: 'VIP' },
    ];
    const d = dedupeBookingWheelPackagesByDuration(list, 'VIP');
    expect(d).toHaveLength(2);
    expect(d.find((p) => p.product_id === 1)).toBeTruthy();
    expect(d.find((p) => p.product_id === 5)).toBeTruthy();
  });
});

describe('mergeBookingProductsCatalog', () => {
  it('replaces vibe session packages with cafe list when flag is true', () => {
    const vibe: ProductItem[] = [
      { product_id: 1, product_name: 'wrong 3h from prices', duration: '180' },
      { product_id: 99, product_name: 'Пополнение', product_type: 'deposit' },
    ];
    const cafe: ProductItem[] = [{ product_id: 2, product_name: 'Real 3h VIP', duration: '180', group_name: 'VIP' }];
    const merged = mergeBookingProductsCatalog(vibe, cafe, true);
    expect(merged.some((p) => p.product_id === 1)).toBe(false);
    expect(merged.some((p) => p.product_id === 2)).toBe(true);
    expect(merged.some((p) => p.product_id === 99)).toBe(true);
  });
});

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
