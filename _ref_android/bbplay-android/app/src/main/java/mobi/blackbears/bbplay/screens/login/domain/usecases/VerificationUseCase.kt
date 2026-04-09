package mobi.blackbears.bbplay.screens.login.domain.usecases

import mobi.blackbears.bbplay.screens.login.domain.model.RequestCodeResult
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationNumberResult
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationPhoneData

interface VerificationUseCase {
    suspend fun tryRequestCode(
        userId: Long,
        userPhone: String,
    ): RequestCodeResult

    suspend fun tryVerify(data: VerificationPhoneData): VerificationNumberResult
}