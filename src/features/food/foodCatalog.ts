import type { ImageSourcePropType } from 'react-native';

export type FoodCategoryId = 'drinks' | 'sweet' | 'snacks' | 'savory';

export type FoodProduct = {
  id: string;
  nameRu: string;
  nameEn: string;
  priceRub: number;
  category: FoodCategoryId;
  image: ImageSourcePropType;
};

/* Локальные фото товаров (PNG) в assets/food */
const img = {
  'cola.png': require('../../../assets/food/cola.png'),
  'fanta.png': require('../../../assets/food/fanta.png'),
  'redbull.png': require('../../../assets/food/redbull.png'),
  'monster.png': require('../../../assets/food/monster.png'),
  'mors.png': require('../../../assets/food/mors.png'),
  'apple-juice.png': require('../../../assets/food/apple-juice.png'),
  'snickers.png': require('../../../assets/food/snickers.png'),
  'twix.png': require('../../../assets/food/twix.png'),
  'bounty.png': require('../../../assets/food/bounty.png'),
  'kinder-bueno.png': require('../../../assets/food/kinder-bueno.png'),
  'milka.png': require('../../../assets/food/milka.png'),
  'lays.png': require('../../../assets/food/lays.png'),
  'pringles.png': require('../../../assets/food/pringles.png'),
  'oreo.png': require('../../../assets/food/oreo.png'),
  'doshirak-chicken.png': require('../../../assets/food/doshirak-chicken.png'),
  'rollton.png': require('../../../assets/food/rollton.png'),
  'cheburek.png': require('../../../assets/food/cheburek.png'),
  'chebupizza.png': require('../../../assets/food/chebupizza.png'),
} as const;

export const FOOD_CATEGORIES: { id: FoodCategoryId; labelRu: string; labelEn: string }[] = [
  { id: 'drinks', labelRu: 'Напитки', labelEn: 'Drinks' },
  { id: 'sweet', labelRu: 'Сладкое', labelEn: 'Sweets' },
  { id: 'snacks', labelRu: 'Снеки', labelEn: 'Snacks' },
  { id: 'savory', labelRu: 'Сытное', labelEn: 'Savory' },
];

export const FOOD_PRODUCTS: FoodProduct[] = [
  {
    id: 'cola-05',
    nameRu: 'Coca-Cola, 0,5 л',
    nameEn: 'Coca-Cola, 0.5 L',
    priceRub: 90,
    category: 'drinks',
    image: img['cola.png'],
  },
  {
    id: 'fanta-05',
    nameRu: 'Fanta, апельсин, 0,5 л',
    nameEn: 'Fanta orange, 0.5 L',
    priceRub: 85,
    category: 'drinks',
    image: img['fanta.png'],
  },
  {
    id: 'energy-bull',
    nameRu: 'Red Bull, 0,25 л',
    nameEn: 'Red Bull, 0.25 L',
    priceRub: 180,
    category: 'drinks',
    image: img['redbull.png'],
  },
  {
    id: 'energy-monster',
    nameRu: 'Monster Energy Zero Sugar, 0,5 л',
    nameEn: 'Monster Energy zero sugar, 0.5 L',
    priceRub: 150,
    category: 'drinks',
    image: img['monster.png'],
  },
  {
    id: 'mors-03',
    nameRu: 'Сок «Rich» вишня, 0,33 л',
    nameEn: '«Rich» cherry juice, 0.33 L',
    priceRub: 60,
    category: 'drinks',
    image: img['mors.png'],
  },
  {
    id: 'juice-box',
    nameRu: 'Сок «Добрый» яблочный, 0,2 л',
    nameEn: '«Dobriy» apple juice, 0.2 L',
    priceRub: 50,
    category: 'drinks',
    image: img['apple-juice.png'],
  },
  {
    id: 'snickers-50',
    nameRu: 'Snickers, 50 г',
    nameEn: 'Snickers, 50 g',
    priceRub: 100,
    category: 'sweet',
    image: img['snickers.png'],
  },
  {
    id: 'twix-50',
    nameRu: 'Twix, 50 г',
    nameEn: 'Twix, 50 g',
    priceRub: 70,
    category: 'sweet',
    image: img['twix.png'],
  },
  {
    id: 'bounty-57',
    nameRu: 'Bounty, 57 г',
    nameEn: 'Bounty, 57 g',
    priceRub: 80,
    category: 'sweet',
    image: img['bounty.png'],
  },
  {
    id: 'kinder-bueno',
    nameRu: 'Kinder Bueno, 43 г',
    nameEn: 'Kinder Bueno, 43 g',
    priceRub: 120,
    category: 'sweet',
    image: img['kinder-bueno.png'],
  },
  {
    id: 'milka-90',
    nameRu: 'Milka, молочный, 90 г',
    nameEn: 'Milka classic, 90 g',
    priceRub: 100,
    category: 'sweet',
    image: img['milka.png'],
  },
  {
    id: 'lays-140',
    nameRu: "Lay's, рифлёные, сметана и лук, 140 г",
    nameEn: 'Lay’s ridged, sour cream & onion, 140 g',
    priceRub: 120,
    category: 'snacks',
    image: img['lays.png'],
  },
  {
    id: 'pringles-165',
    nameRu: 'Pringles, оригинал, 165 г',
    nameEn: 'Pringles original, 165 g',
    priceRub: 200,
    category: 'snacks',
    image: img['pringles.png'],
  },
  {
    id: 'oreo-6',
    nameRu: 'Печенье Oreo, 10 шт.',
    nameEn: 'Oreo cookies, 10 pcs',
    priceRub: 40,
    category: 'snacks',
    image: img['oreo.png'],
  },
  {
    id: 'doshirak-chicken',
    nameRu: 'Doshirak, курица',
    nameEn: 'Doshirak instant noodles, chicken',
    priceRub: 70,
    category: 'savory',
    image: img['doshirak-chicken.png'],
  },
  {
    id: 'rollton-beef',
    nameRu: 'Rollton, острая говядина',
    nameEn: 'Rollton instant noodles, spicy beef',
    priceRub: 70,
    category: 'savory',
    image: img['rollton.png'],
  },
  {
    id: 'chebureki-2',
    nameRu: 'Чебурек с мясом, 2 шт.',
    nameEn: 'Meat cheburek, 2 pcs',
    priceRub: 150,
    category: 'savory',
    image: img['cheburek.png'],
  },
  {
    id: 'chebupizza',
    nameRu: 'Чебупицца пепперони «Горячая штучка», 250 г',
    nameEn: 'Pepperoni chebupizza, 250 g',
    priceRub: 180,
    category: 'savory',
    image: img['chebupizza.png'],
  },
];

export function getProductById(id: string): FoodProduct | undefined {
  return FOOD_PRODUCTS.find((p) => p.id === id);
}
