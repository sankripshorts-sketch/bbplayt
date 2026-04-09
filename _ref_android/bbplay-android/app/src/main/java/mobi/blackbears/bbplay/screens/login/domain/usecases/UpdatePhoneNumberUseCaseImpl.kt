package mobi.blackbears.bbplay.screens.login.domain.usecases

import mobi.blackbears.bbplay.screens.login.data.network.LoginRepository
import javax.inject.Inject

class UpdatePhoneNumberUseCaseImpl @Inject constructor(
    private val repository: LoginRepository
) : UpdatePhoneNumberUseCase {
    override suspend fun invoke(userId: Long, newPhone: String, oldPhone: String): Boolean {
        return repository.updatePhoneNumber(userId, newPhone, oldPhone)
    }

}