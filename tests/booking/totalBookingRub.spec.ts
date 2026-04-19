import { describe, expect, it } from 'vitest';
import type { PcListItem, PriceItem, ProductItem } from '../../src/api/types';
import {
  bookingTariffIdsForApi,
  productRubFromItem,
  totalBookingRub,
} from '../../src/features/booking/zoneTariffResolve';
import type { TariffChoice } from '../../src/features/booking/tariffSelection';

const pc: PcListItem = {
  pc_name: 'A1',
  pc_area_name: 'Game',
  pc_group_name: 'GameZone',
  pc_icafe_id: 1,
  is_using: false,
  start_date: null,
  start_time: null,
  end_date: null,
  end_time: null,
};

describe('productRubFromItem', () => {
  it('prefers product_price over total_price when both are set (member / фактическая сумма)', () => {
    const p: ProductItem = {
      product_id: 1,
      product_name: 'Pack',
      product_price: '450',
      total_price: '600',
    };
    expect(productRubFromItem(p)).toBe(450);
  });
});

describe('totalBookingRub', () => {
  it('uses server catalog product for non-hourly duration (e.g. 210 min), not ₽/ч × минуты', () => {
    const template: TariffChoice = {
      kind: 'price',
      item: {
        price_id: 1,
        price_name: 'Hourly',
        duration: '60',
        price_price1: '200',
        group_name: 'GameZone',
      },
    };
    const products: ProductItem[] = [
      {
        product_id: 99,
        product_name: '210 мин',
        duration: '210',
        total_price: '777',
        group_name: 'GameZone',
      },
    ];
    expect(totalBookingRub(template, [pc], [template.item], products, 210)).toBe(777);
  });

  it('uses catalog product price for 180 min when tariff is hourly (price), not ₽/ч × 180', () => {
    const template: TariffChoice = {
      kind: 'price',
      item: {
        price_id: 1,
        price_name: 'Hourly',
        duration: '60',
        price_price1: '200',
        group_name: 'GameZone',
      },
    };
    const prices: PriceItem[] = [template.item];
    const products: ProductItem[] = [
      {
        product_id: 10,
        product_name: '3h pack',
        duration: '180',
        total_price: '500',
        group_name: 'GameZone',
      },
    ];
    const rub = totalBookingRub(template, [pc], prices, products, 180);
    expect(rub).toBe(500);
  });

  it('uses product_price from catalog when it is lower than total_price', () => {
    const template: TariffChoice = {
      kind: 'price',
      item: {
        price_id: 1,
        price_name: 'Hourly',
        duration: '60',
        price_price1: '200',
        group_name: 'GameZone',
      },
    };
    const prices: PriceItem[] = [template.item];
    const products: ProductItem[] = [
      {
        product_id: 10,
        product_name: '3h pack',
        duration: '180',
        total_price: '600',
        product_price: '450',
        group_name: 'GameZone',
      },
    ];
    expect(totalBookingRub(template, [pc], prices, products, 180)).toBe(450);
  });

  it('uses price tier when server sends no products for this duration (fallback)', () => {
    const tier: PriceItem = {
      price_id: 2,
      price_name: 'Pack',
      duration: '180',
      price_price1: '200',
      total_price: '450',
      group_name: 'GameZone',
    };
    const template: TariffChoice = { kind: 'price', item: tier };
    expect(totalBookingRub(template, [pc], [tier], [], 180)).toBe(450);
  });

  it('picks package by <<<GZ>>> / <<<BC>>> in name when group_name missing (iCafe /products)', () => {
    const suffix = '<<<180<<<180<<<1|2|3|4|5|6|7<<<00:00-23:59<<<';
    const products: ProductItem[] = [
      {
        product_id: 1591251349,
        product_name: `3 часа/пакет${suffix}BC`,
        product_price: '80',
      },
      {
        product_id: 1591251485,
        product_name: `3 часа/пакет${suffix}GZ`,
        product_price: '50',
      },
    ];
    const template: TariffChoice = {
      kind: 'product',
      item: products[1]!,
    };
    expect(totalBookingRub(template, [pc], [], products, 180)).toBe(50);
    const pcBc: PcListItem = { ...pc, pc_group_name: 'BootCamp' };
    expect(totalBookingRub(template, [pcBc], [], products, 180)).toBe(80);
  });

  it('picks package by PC zone (VIP vs GameZone)', () => {
    const pcVip: PcListItem = { ...pc, pc_name: 'V1', pc_group_name: 'VIP' };
    const template: TariffChoice = {
      kind: 'price',
      item: {
        price_id: 1,
        price_name: 'Hourly',
        duration: '60',
        price_price1: '100',
        group_name: 'GameZone',
      },
    };
    const products: ProductItem[] = [
      { product_id: 1, product_name: '3h VIP', duration: '180', total_price: '800', group_name: 'VIP' },
      { product_id: 2, product_name: '3h GZ', duration: '180', total_price: '500', group_name: 'GameZone' },
    ];
    expect(totalBookingRub(template, [pcVip], [], products, 180)).toBe(800);
    expect(totalBookingRub(template, [pc], [], products, 180)).toBe(500);
  });

  it('does not substitute another zone package when only zoned rows exist', () => {
    const pcVip: PcListItem = { ...pc, pc_group_name: 'VIP' };
    const products: ProductItem[] = [
      { product_id: 2, product_name: '3h GZ', duration: '180', total_price: '500', group_name: 'GameZone' },
    ];
    const template: TariffChoice = {
      kind: 'price',
      item: {
        price_id: 1,
        price_name: 'H',
        duration: '60',
        price_price1: '100',
        group_name: 'GameZone',
      },
    };
    expect(Number.isNaN(totalBookingRub(template, [pcVip], [], products, 180))).toBe(true);
  });

  it('keeps linear extrapolation when session length does not match any tier duration', () => {
    const tier: PriceItem = {
      price_id: 3,
      price_name: 'H',
      duration: '60',
      price_price1: '120',
      group_name: 'GameZone',
    };
    const template: TariffChoice = { kind: 'price', item: tier };
    const rub = totalBookingRub(template, [pc], [tier], [], 90);
    expect(rub).toBeCloseTo(180, 5);
  });
});

describe('bookingTariffIdsForApi', () => {
  it('uses zone-matched product_id for 180 min when template is hourly', () => {
    const template: TariffChoice = {
      kind: 'price',
      item: {
        price_id: 1,
        price_name: 'Hourly',
        duration: '60',
        price_price1: '100',
        group_name: 'GameZone',
      },
    };
    const products: ProductItem[] = [
      { product_id: 11, product_name: '3h VIP', duration: '180', total_price: '800', group_name: 'VIP' },
      { product_id: 22, product_name: '3h GZ', duration: '180', total_price: '500', group_name: 'GameZone' },
    ];
    const pcVip: PcListItem = { ...pc, pc_group_name: 'VIP' };
    expect(bookingTariffIdsForApi(template, pcVip, [], products, 180)).toEqual({
      kind: 'product',
      product_id: 11,
    });
    expect(bookingTariffIdsForApi(template, pc, [], products, 180)).toEqual({
      kind: 'product',
      product_id: 22,
    });
  });
});
