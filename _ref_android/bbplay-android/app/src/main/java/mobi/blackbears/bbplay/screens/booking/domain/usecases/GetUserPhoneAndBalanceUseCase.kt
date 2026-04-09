package mobi.blackbears.bbplay.screens.booking.domain.usecases

import mobi.blackbears.bbplay.screens.booking.domain.model.UserPhoneAndBalance

interface GetUserPhoneAndBalanceUseCase {
    suspend fun getUserPhoneAndBalance(userId: Long): UserPhoneAndBalance
}