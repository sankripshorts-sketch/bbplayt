package mobi.blackbears.bbplay.screens.booking.domain.usecases

import mobi.blackbears.bbplay.common.preferences.UserData
import mobi.blackbears.bbplay.screens.booking.domain.model.booking.*

interface BookingUseCase {
    /**
     * Оформление брони
     */
    suspend fun makeBooking(
        pcName: String,
        userData: UserData,
        startDate: String,
        startTime: String,
        minutes: String,
        priceId: Long?
    )

    /**
     * Получить все брони
     */
    suspend fun getAllBookings(): List<BookingInfo>

    /**
     * Получить брони по пользователю
     */
    suspend fun getBookingsByMemberAccount(memberAccount: String): List<BookingInfo>
}