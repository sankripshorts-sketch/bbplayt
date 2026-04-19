import type {
  AllBooksData,
  AllPricesData,
  AvailablePcsData,
  CafeItem,
  IcafeIdForMemberData,
  LoginRequest,
  StructRoomsData,
} from './types';
import { getAllBooksPath } from '../config/vibePaths';
import { normalizeAllBooksData } from './normalizeAllBooks';
import { normalizeAllPricesData } from './normalizeAllPrices';
import { normalizeAvailablePcsData } from './normalizeAvailablePcs';
import {
  vibeDeleteIcafeBookings,
  vibeGet,
  vibeLogin,
  vibePostJsonBooking,
  vibePostJsonBookingBatch,
} from './vibeClient';
import { buildBookingKey } from './bookingKey';

export async function loginRequest(creds: LoginRequest) {
  return vibeLogin(creds.username, creds.password);
}

export const cafesApi = {
  list: () => vibeGet<CafeItem[]>('/cafes'),
};

export const bookingFlowApi = {
  /**
   * Снимок слота для UI; финальная валидация только в POST /booking (iCafe).
   * Расхождение «в списке свободен» / «400 There are other booking» возможно из‑за гонки,
   * другой брони, правил клуба, техперерыва.
   */
  /**
   * Свободные ПК на **выбранный слот** (дата/время/длительность) — только шлюз vibe.
   * `GET /available-pcs-for-booking`. Не смешивать с онлайн-списком `GET .../pcs` (занятость «сейчас»).
   */
  availablePcs: async (params: {
    cafeId: number;
    dateStart: string;
    timeStart: string;
    mins: number;
    isFindWindow?: boolean;
    priceName?: string;
    signal?: AbortSignal;
  }): Promise<AvailablePcsData> => {
    const raw = await vibeGet<unknown>(
      '/available-pcs-for-booking',
      {
        cafeId: params.cafeId,
        dateStart: params.dateStart,
        timeStart: params.timeStart,
        mins: params.mins,
        isFindWindow: params.isFindWindow === undefined ? undefined : params.isFindWindow,
        priceName: params.priceName,
      },
      { signal: params.signal },
    );
    return normalizeAvailablePcsData(raw);
  },

  structRooms: (cafeId: number) =>
    vibeGet<StructRoomsData>('/struct-rooms-icafe', { cafeId }),

  allPrices: async (params: {
    cafeId: number;
    memberId?: string;
    mins?: number;
    bookingDate?: string;
  }) => {
    const raw = await vibeGet<unknown>('/all-prices-icafe', {
      cafeId: params.cafeId,
      memberId: params.memberId,
      mins: params.mins,
      bookingDate: params.bookingDate,
    });
    return normalizeAllPricesData(raw);
  },

  memberBooks: async (memberAccount?: string): Promise<AllBooksData> => {
    const acc = memberAccount?.trim();
    const raw = await vibeGet<unknown>(getAllBooksPath(), {
      ...(acc ? { memberAccount: acc, member_account: acc } : {}),
    });
    return normalizeAllBooksData(raw);
  },

  icafeIdForMember: () => vibeGet<IcafeIdForMemberData>('/icafe-id-for-member'),

  /**
   * Создание брони: `POST /booking` с телом **application/json** (см. `vibePostJsonBooking`).
   * Почасовка: только слот и `mins` — **`price_id` из прайса не слать** (iCafe «Product not found» на vibe).
   * Пакет: **`product_id`** из каталога (`products` в `/all-prices-icafe`).
   */
  createBooking: async (params: {
    icafe_id: number;
    pc_name: string;
    member_account: string;
    member_id: string;
    start_date: string;
    start_time: string;
    mins: number;
    private_key?: string;
    /** Только для пакета (каталог iCafe). */
    product_id?: number | null;
  }) => {
    const rand_key = `${Date.now()}${Math.floor(Math.random() * 1e9)}`;
    const key = await buildBookingKey({
      randKey: rand_key,
      memberId: params.member_id,
      memberAccount: params.member_account,
      icafeId: params.icafe_id,
      pcName: params.pc_name,
      startDate: params.start_date,
      startTime: params.start_time,
      mins: params.mins,
      privateKey: params.private_key,
    });
    const fields: Record<string, string | number> = {
      icafe_id: params.icafe_id,
      pc_name: params.pc_name,
      member_account: params.member_account,
      member_id: params.member_id,
      start_date: params.start_date,
      start_time: params.start_time,
      mins: params.mins,
      rand_key,
      key,
    };
    const pk = params.private_key?.trim();
    if (pk) fields.private_key = pk;
    if (params.product_id != null && Number.isFinite(params.product_id)) {
      fields.product_id = params.product_id;
    }
    return vibePostJsonBooking(fields);
  },

  /**
   * Несколько ПК одним запросом (`POST /booking-batch` на vibe).
   * Тело: общие дата/время/длительность + массив `bookings` (по одному ПК на участника).
   * При ошибке шлюза клиент может откатиться на несколько `createBooking`.
   */
  createBookingBatch: async (params: {
    icafe_id: number;
    start_date: string;
    start_time: string;
    mins: number;
    member_account: string;
    member_id: string;
    private_key?: string;
    /** У каждой строки: опционально `product_id` (пакет). Почасовка — без id. */
    bookings: { pc_name: string; product_id?: number | null }[];
  }) => {
    const rand_key = `${Date.now()}${Math.floor(Math.random() * 1e9)}`;
    const combinedPc = [...params.bookings]
      .map((b) => b.pc_name)
      .sort()
      .join('|');
    const key = await buildBookingKey({
      randKey: rand_key,
      memberId: params.member_id,
      memberAccount: params.member_account,
      icafeId: params.icafe_id,
      pcName: combinedPc || params.bookings[0]?.pc_name || '',
      startDate: params.start_date,
      startTime: params.start_time,
      mins: params.mins,
      privateKey: params.private_key,
    });
    const body: Record<string, unknown> = {
      icafe_id: params.icafe_id,
      start_date: params.start_date,
      start_time: params.start_time,
      mins: params.mins,
      duration_min: params.mins,
      member_account: params.member_account,
      member_id: params.member_id,
      rand_key,
      key,
      bookings: params.bookings.map((b) => {
        const row: Record<string, unknown> = {
          pc_name: b.pc_name,
          member_account: params.member_account,
          member_id: params.member_id,
        };
        if (b.product_id != null && Number.isFinite(b.product_id)) {
          row.product_id = b.product_id;
        }
        return row;
      }),
    };
    const pk = params.private_key?.trim();
    if (pk) body.private_key = pk;
    return vibePostJsonBookingBatch(body);
  },

  /**
   * Отмена: iCafe Cloud `DELETE /api/v2/cafe/{cafeId}/bookings` (см. документацию API).
   * Старый `POST /booking-cancel` на прокси может быть недоступен («Api not allowed»).
   */
  cancelBooking: async (params: {
    icafe_id: number;
    pc_name: string;
    member_account: string;
    member_id: string;
    member_offer_id: number;
    private_key?: string;
  }) =>
    vibeDeleteIcafeBookings({
      icafeId: params.icafe_id,
      pc_name: params.pc_name,
      member_offer_id: params.member_offer_id,
    }),
};
