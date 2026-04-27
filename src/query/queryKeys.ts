export const queryKeys = {
  /** Первая страница стены VK (парсинг HTML) — ключ по id сообщества (город). */
  vkWallFirstPage: (vkGroupId: number) => ['vk-wall', 'first-page', vkGroupId] as const,
  /** Агрегированный кэш ленты VK (первая + догруженные страницы). */
  vkWallFeed: (vkGroupId: number) => ['vk-wall', 'feed', vkGroupId] as const,
  cafes: () => ['cafes'] as const,
  icafeIdForMember: () => ['icafe-id-for-member'] as const,
  structRooms: (cafeId: number) => ['struct-rooms', cafeId] as const,
  allPricesKnowledge: (cafeId: number) => ['all-prices-knowledge', cafeId] as const,
  allPrices: (p: { cafeId: number; memberId?: string; mins: number; bookingDate: string }) =>
    ['all-prices', p.cafeId, p.memberId ?? '', p.mins, p.bookingDate] as const,
  /** GET iCafe `/api/v2/cafe/{id}/products` — пакеты брони (Bearer private_key) */
  cafeBookingProducts: (cafeId: number) => ['cafe-booking-products', cafeId] as const,
  availablePcs: (p: {
    cafeId: number;
    dateStart: string;
    timeStart: string;
    mins: number;
    isFindWindow: boolean;
    priceName: string;
  }) =>
    [
      'available-pcs',
      p.cafeId,
      p.dateStart,
      p.timeStart,
      p.mins,
      p.isFindWindow,
      p.priceName,
    ] as const,
  books: (memberAccount?: string, memberId?: string) =>
    ['books', memberAccount?.trim() ?? '', memberId?.trim() ?? ''] as const,
  /** GET iCafe `/api/v2/cafe/{id}/bookings` — все брони клуба */
  cafeBookings: (cafeId: number) => ['cafe-bookings-icafe', cafeId] as const,
  /** Онлайн-состояние ПК (GET /api/v2/cafe/{id}/pcs) */
  livePcs: (cafeId: number) => ['live-pcs', cafeId] as const,
};
