package mobi.blackbears.bbplay.screens.login.domain.usecases

import mobi.blackbears.bbplay.screens.login.data.network.LoginRepository
import mobi.blackbears.bbplay.screens.login.domain.model.NewAccountFields
import kotlinx.coroutines.flow.Flow
import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.extensions.encodeString
import mobi.blackbears.bbplay.screens.login.domain.model.LoginResult
import javax.inject.Inject

class RegistrationUseCaseImpl @Inject constructor(
    private val repository: LoginRepository
): RegistrationUseCase {
    override fun tryRegistration(fields: NewAccountFields): Flow<Pair<Long, String>> =
        repository.createAccount(fields)

    override suspend fun tryLogin(memberName: String, password: String): LoginResult {
        return repository.login(memberName, password)
    }
}