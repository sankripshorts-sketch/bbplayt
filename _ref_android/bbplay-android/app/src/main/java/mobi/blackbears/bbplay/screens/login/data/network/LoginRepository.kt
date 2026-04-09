package mobi.blackbears.bbplay.screens.login.data.network

import kotlinx.coroutines.flow.Flow
import mobi.blackbears.bbplay.screens.login.domain.model.NewAccountFields
import mobi.blackbears.bbplay.screens.login.domain.model.RequestCodeResult
import mobi.blackbears.bbplay.screens.login.domain.model.LoginResult
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationNumberResult
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationPhoneData

interface LoginRepository {

    suspend fun login(memberName: String, password: String): LoginResult

    fun createAccount(fields: NewAccountFields): Flow<Pair<Long, String>>

    suspend fun requestVerificationCode(userId: Long, userPhone: String): RequestCodeResult

    suspend fun verifyPhoneNumber(data: VerificationPhoneData): VerificationNumberResult

    suspend fun updatePhoneNumber(userId: Long, newPhone: String, oldPhone: String) : Boolean
}