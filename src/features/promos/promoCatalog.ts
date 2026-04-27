import type { MessageKey } from '../../i18n/messagesRu';
import type { PromoId } from './promoTypes';

export const PROMO_ORDER: readonly PromoId[] = ['birthday', 'maps_review', 'dice'] as const;

export type PromoVisual = {
  id: PromoId;
  /** Имена иконок MaterialCommunityIcons */
  icon: string;
  /** Ключи i18n */
  i18nTitle: MessageKey;
  i18nCardLine: MessageKey;
  /** Градиент/акцент оформления карточки */
  accent: 'violet' | 'gold' | 'emerald';
};

export const PROMO_VISUAL: Record<PromoId, PromoVisual> = {
  birthday: {
    id: 'birthday',
    icon: 'cake-variant',
    i18nTitle: 'promo.birthdayTitle',
    i18nCardLine: 'promo.birthdayCardLine',
    accent: 'violet',
  },
  maps_review: {
    id: 'maps_review',
    icon: 'map-marker-star',
    i18nTitle: 'promo.mapsTitle',
    i18nCardLine: 'promo.mapsCardLine',
    accent: 'gold',
  },
  dice: {
    id: 'dice',
    icon: 'dice-5',
    i18nTitle: 'promo.diceTitle',
    i18nCardLine: 'promo.diceCardLine',
    accent: 'emerald',
  },
};
