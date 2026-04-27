/** Ответы vibe.blackbearsplay.ru и связанных вызовов (см. docs/api-spec.md) */

export type VibeEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

export type ApiErrorBody = {
  message?: string;
  code?: number;
  errors?: Record<string, string[]>;
};

/** POST /login — тело запроса (username/password в открытом виде по документации) */
export type LoginRequest = {
  username: string;
  password: string;
};

/** Данные сессии после логина (поля зависят от бэкенда; парсим гибко) */
export type SessionUser = {
  /** Числовой id участника iCafe — нужен для POST /booking */
  memberId: string;
  memberAccount: string;
  /** private_key из ответа логина — для подписи POST /booking (режим android на прокси) */
  privateKey?: string;
  /** Баланс, если сервер отдаёт в ответе логина / профиля */
  balanceRub?: number;
  /** Бонусный баланс (iCafe), если есть */
  bonusBalanceRub?: number;
  displayName?: string;
  raw: Record<string, unknown>;
};

export type CafeItem = {
  address: string;
  /** Отображаемое название клуба, если приходит с API */
  name?: string;
  icafe_id: number;
  lat?: number;
  lng?: number;
  phone?: string;
  vk_url?: string;
  site?: string;
};

export type PcListItem = {
  pc_name: string;
  pc_area_name: string;
  /** Группа ПК для прайса (iCafe price PC group), для сопоставления с `group_name` в тарифах — важнее подписи зала */
  pc_group_name?: string;
  pc_icafe_id: number;
  price_name?: string;
  is_using: boolean;
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  [key: string]: unknown;
};

export type AvailablePcsData = {
  time_frame?: string;
  pc_list: PcListItem[];
};

export type PriceItem = {
  price_id: number;
  price_name: string;
  price_price1?: string;
  total_price?: string;
  group_name?: string;
  duration?: string;
};

export type ProductItem = {
  product_id: number;
  product_name: string;
  product_price?: string;
  total_price?: string;
  /** Тип продукта в iCafe (пополнение / пакет и т.д.) */
  product_type?: string;
  group_name?: string;
  duration?: string;
  duration_min?: string;
  is_calc_duration?: boolean;
  /** Выгода / акция с сервера (отдельное поле iCafe; фрагменты `<<<…>>>` разбираются в UI) */
  package_hint?: string;
};

export type TimeTechBreakNormalized = {
  startMins: number;
  durationMins: number;
};

export type AllPricesData = {
  prices: PriceItem[];
  products: ProductItem[];
  step_start_booking?: number;
  time_tech_break?: TimeTechBreakNormalized | null;
};

export type BookingPostBody = {
  icafe_id: number;
  pc_name: string;
  member_account: string;
  member_id: string;
  start_date: string;
  start_time: string;
  mins: number;
  rand_key: string;
  key: string;
};

export type MemberBookingRow = {
  product_id: number;
  product_pc_name: string;
  product_available_date_local_from: string;
  product_available_date_local_to: string;
  product_mins: number;
  product_description?: string;
  /** iCafe: id оффера/брони для отмены; в ответе может быть только `id` рядом с product_id каталога */
  member_offer_id?: number;
  member_account?: string;
  /** Явный id брони в ответе шлюза (если отличается от product_id каталога) */
  booking_id?: number;
};

/** Список броней по клубам: путь задаётся `getAllBooksPath()` (`/all-books-cafes` или `/all-books-member`). */
export type AllBooksData = Record<string, MemberBookingRow[]>;

export type IcafeIdForMemberData = {
  icafe_id: string;
};

export type StructPc = {
  pc_name: string;
  pc_area_name?: string;
  pc_box_left: number;
  pc_box_top: number;
  pc_box_position?: string;
  pc_icafe_id?: number;
  pc_group_name?: string;
};

export type StructRoom = {
  area_name: string;
  area_index?: number;
  area_frame_x: number;
  area_frame_y: number;
  area_frame_width: number;
  area_frame_height: number;
  area_allow_booking?: number;
  pcs_list: StructPc[];
  color_border?: string;
  color_text?: string;
};

export type StructRoomsData = {
  rooms: StructRoom[];
};
