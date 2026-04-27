import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Доля max-height карточки в `CenteredCardModal` — тело + шапка не должны вылезать за неё
 * (у карточки `overflow: 'hidden'`).
 */
const CARD_MAX_HEIGHT_FRACTION = 0.96;

/**
 * Фиксированная высота тела модалки (px) для мини-игры кубика и welcome-оверлея.
 * Карточки текстовых акций (`PromoDetailModal`) высоту не задают — подстраиваются под контент.
 */
export function usePromoModalBodyHeight() {
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return useMemo(() => {
    const outerPadV = Math.max(16, Math.min(32, 10 + insets.top * 0.32));
    const bottomPad = Math.max(16, 6 + insets.bottom);
    const verticalRoom = winH - outerPadV - bottomPad;
    /**
     * Шапка: `titleRow` + до 2 строк заголовка. Чуть с запасом, чтобы тело не выталкивало карточку за max-height.
     */
    const titleAndCardChrome = 100;
    const byBackdrop = Math.max(0, Math.floor(verticalRoom - titleAndCardChrome));
    const byCardCap = Math.floor(winH * CARD_MAX_HEIGHT_FRACTION - titleAndCardChrome - 6);
    const capped = Math.min(720, byBackdrop, byCardCap);
    return Math.max(180, capped);
  }, [winH, insets.top, insets.bottom]);
}
