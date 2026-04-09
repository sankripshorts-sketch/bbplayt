package mobi.blackbears.bbplay.screens.booking.domain.usecases

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.common.preferences.UserData
import mobi.blackbears.bbplay.screens.booking.domain.BookingRepository
import mobi.blackbears.bbplay.screens.booking.domain.model.booking.*
import javax.inject.Inject

class BookingUseCaseImpl @Inject constructor(
    private val repository: BookingRepository
) : BookingUseCase {

    override suspend fun makeBooking(
        pcName: String,
        userData: UserData,
        startDate: String,
        startTime: String,
        minutes: String,
        priceId: Long?
    ) {
        val memberId = userData.userId
        val randomKey = getRandomString()
        val md5 = "$memberId$randomKey${userData.userPrivateKey}${BuildConfig.SECRET_KEY}".encodeStringToMD5()
        repository.makeBooking(
            pcName,
            userData.nickname,
            memberId.toString(),
            startDate,
            startTime,
            minutes,
            priceId,
            randomKey,
            md5
        )
    }

    override suspend fun getAllBookings(): List<BookingInfo> = repository.getAllBookings()

    override suspend fun getBookingsByMemberAccount(memberAccount: String): List<BookingInfo> =
        getAllBookings().filter { it.memberAccount == memberAccount }
}