package mobi.blackbears.bbplay.screens.login.domain.usecases

import mobi.blackbears.bbplay.screens.login.data.network.LoginRepository
import mobi.blackbears.bbplay.screens.login.domain.model.RequestCodeResult
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationNumberResult
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationPhoneData
import javax.inject.Inject

class VerificationUseCaseImpl @Inject constructor(
    private val repository: LoginRepository
) : VerificationUseCase {
    override suspend fun tryRequestCode(userId: Long, userPhone: String): RequestCodeResult {
        return repository.requestVerificationCode(userId, userPhone)
    }

    override suspend fun tryVerify(data: VerificationPhoneData): VerificationNumberResult {
        return repository.verifyPhoneNumber(data)
    }
}