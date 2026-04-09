package mobi.blackbears.bbplay.screens.booking.domain

import mobi.blackbears.bbplay.screens.booking.domain.model.*
import mobi.blackbears.bbplay.screens.booking.domain.model.booking.*

interface BookingRepository {

    suspend fun getShortUserInfo(memberId: Long): UserPhoneAndBalance

    suspend fun getClubsInfo(): ClubInfo

    suspend fun getPricesFromHour(): List<PricePerHour>

    suspend fun getShopProducts(): List<SpecialProductPrice>

    suspend fun getAreasWithPcs(): List<AreaZone>

    suspend fun makeBooking(
        pcName: String,
        memberAccount: String,
        memberId: String,
        startDate: String,
        startTime: String,
        minutes: String,
        priceId: Long?,
        randomKey: String,
        key: String
    )

    suspend fun getAllBookings(): List<BookingInfo>
}