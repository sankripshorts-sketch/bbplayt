/**
 * Демо-пополнение: бонусные рубли начисляются только локально (сессия приложения), без iCafe.
 * Та же формула для таблицы быстрых сумм в модалке и для произвольной суммы.
 */
const QUICK_PAIRS: readonly [number, number][] = [
  [100, 10],
  [200, 20],
  [500, 50],
  [1000, 100],
  [1500, 150],
];

/**
 * @param topupValue — сумма пополнения (₽)
 * @param promoCode — непустой: усиливаем бонус (демо-акция)
 */
export function localTopupBonusRub(topupValue: number, promoCode?: string): number {
  if (!Number.isFinite(topupValue) || topupValue <= 0) return 0;
  const exact = QUICK_PAIRS.find(([a]) => Math.abs(a - topupValue) < 0.01);
  let b = exact != null ? exact[1] : Math.max(0, Math.floor(topupValue * 0.1));
  if (promoCode?.trim()) {
    b = Math.floor(b * 1.15) + 5;
  }
  return b;
}
