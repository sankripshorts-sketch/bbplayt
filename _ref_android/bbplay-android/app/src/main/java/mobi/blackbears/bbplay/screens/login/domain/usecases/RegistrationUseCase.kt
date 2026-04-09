package mobi.blackbears.bbplay.screens.login.domain.usecases

import mobi.blackbears.bbplay.screens.login.domain.model.NewAccountFields
import kotlinx.coroutines.flow.Flow
import mobi.blackbears.bbplay.screens.login.domain.model.LoginResult

interface RegistrationUseCase {
    fun tryRegistration(fields: NewAccountFields): Flow<Pair<Long, String>>

    suspend fun tryLogin(memberName: String, password: String): LoginResult
}