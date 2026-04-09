import type {
  AllBooksData,
  AllPricesData,
  AvailablePcsData,
  CafeItem,
  IcafeIdForMemberData,
  LoginRequest,
  StructRoomsData,
} from './types';
import { vibeGet, vibeLogin, vibePostForm } from './vibeClient';
import { buildBookingKey } from './bookingKey';

export async function loginRequest(creds: LoginRequest) {
  return vibeLogin(creds.username, creds.password);
}

export const cafesApi = {
  list: () => vibeGet<CafeItem[]>('/cafes'),
};

export const bookingFlowApi = {
  availablePcs: (params: {
    cafeId: number;
    dateStart: string;
    timeStart: string;
    mins: number;
    isFindWindow?: boolean;
    priceName?: string;
  }) =>
    vibeGet<AvailablePcsData>('/available-pcs-for-booking', {
      cafeId: params.cafeId,
      dateStart: params.dateStart,
      timeStart: params.timeStart,
      mins: params.mins,
      isFindWindow: params.isFindWindow === undefined ? undefined : params.isFindWindow,
      priceName: params.priceName,
    }),

  structRooms: (cafeId: number) =>
    vibeGet<StructRoomsData>('/struct-rooms-icafe', { cafeId }),

  allPrices: (params: {
    cafeId: number;
    memberId?: string;
    mins?: number;
    bookingDate?: string;
  }) =>
    vibeGet<AllPricesData>('/all-prices-icafe', {
      cafeId: params.cafeId,
      memberId: params.memberId,
      mins: params.mins,
      bookingDate: params.bookingDate,
    }),

  memberBooks: (memberAccount?: string) =>
    vibeGet<AllBooksData>('/all-books-cafes', {
      memberAccount: memberAccount,
    }),

  icafeIdForMember: () => vibeGet<IcafeIdForMemberData>('/icafe-id-for-member'),

  /** Создание брони (application/x-www-form-urlencoded) */
  createBooking: async (params: {
    icafe_id: number;
    pc_name: string;
    member_account: string;
    member_id: string;
    start_date: string;
    start_time: string;
    mins: number;
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
    });
    return vibePostForm<unknown>('/booking', {
      icafe_id: params.icafe_id,
      pc_name: params.pc_name,
      member_account: params.member_account,
      member_id: params.member_id,
      start_date: params.start_date,
      start_time: params.start_time,
      mins: params.mins,
      rand_key,
      key,
    });
  },
};
