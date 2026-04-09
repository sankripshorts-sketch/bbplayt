package mobi.blackbears.bbplay.screens.booking.domain.usecases

import mobi.blackbears.bbplay.screens.booking.domain.BookingRepository
import mobi.blackbears.bbplay.screens.booking.domain.model.UserPhoneAndBalance
import javax.inject.Inject

class GetUserPhoneAndBalanceUseCaseImpl @Inject constructor(
    private val repository: BookingRepository
): GetUserPhoneAndBalanceUseCase {
    override suspend fun getUserPhoneAndBalance(userId: Long): UserPhoneAndBalance =
        repository.getShortUserInfo(userId)
}