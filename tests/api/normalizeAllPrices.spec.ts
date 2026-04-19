import { describe, expect, it } from 'vitest';
import { normalizeAllPricesData } from '../../src/api/normalizeAllPrices';

describe('normalizeAllPricesData products duration', () => {
  it('maps numeric mins on product row into duration', () => {
    const data = normalizeAllPricesData({
      products: [{ product_id: 5, product_name: 'Пакет', mins: 180, product_price: '500' }],
    });
    expect(data.products).toHaveLength(1);
    expect(data.products[0]!.duration).toBe('180');
  });

  it('reads products from packages alias when products array is empty', () => {
    const data = normalizeAllPricesData({
      products: [],
      packages: [{ product_id: 7, product_name: 'Ночь', duration: '300', product_price: '900' }],
    });
    expect(data.products).toHaveLength(1);
    expect(data.products[0]!.product_id).toBe(7);
  });

  it('unwraps GET /cafe/.../products style { data: Product[] }', () => {
    const data = normalizeAllPricesData({
      code: 200,
      data: [
        { id: 101, product_name: 'VIP <<<300>>>', product_price: '900', group_name: 'VIP' },
      ],
    });
    expect(data.products).toHaveLength(1);
    expect(data.products[0]!.product_id).toBe(101);
  });
});
