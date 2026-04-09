package mobi.blackbears.bbplay.screens.login.data.network

import mobi.blackbears.bbplay.common.data.model.MemberResponse
import mobi.blackbears.bbplay.screens.login.data.model.RegistrationBody
import mobi.blackbears.bbplay.screens.login.domain.model.User
import mobi.blackbears.bbplay.screens.login.domain.model.NewAccountFields
import mobi.blackbears.bbplay.common.utils.Mapper
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.data.model.isSuccessOrThrowException
import mobi.blackbears.bbplay.screens.login.data.model.LoginBody
import mobi.blackbears.bbplay.screens.login.data.model.RequestCodeBody
import mobi.blackbears.bbplay.screens.login.data.model.UpdatePhoneNumberBody
import mobi.blackbears.bbplay.screens.login.data.model.VerifyPhoneNumberBody
import mobi.blackbears.bbplay.screens.login.domain.model.RequestCodePayload
import mobi.blackbears.bbplay.screens.login.domain.model.RequestCodeResult
import mobi.blackbears.bbplay.screens.login.domain.model.LoginResult
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationNumberResult
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationPhoneData
import javax.inject.Inject

private const val VERIFICATION_REQUIRED_CODE = 412
private const val WRONG_CODE_CODE = 409
private const val TOO_MANY_REQUESTS_CODE = 429

class LoginRepositoryImpl @Inject constructor(
    private val api: LoginApi,
    private val mapper: Mapper<MemberResponse?, User>,
    private val registrationMapper: Mapper<NewAccountFields, RegistrationBody>,
    private val verifyPhoneNumberMapper: Mapper<VerificationPhoneData, VerifyPhoneNumberBody>,
) : LoginRepository {

    override suspend fun login(memberName: String, password: String): LoginResult {
        val login = api.login(LoginBody(memberName, password))
        login.isSuccessOrThrowException()
        val isUserPhoneVerified = login.code != VERIFICATION_REQUIRED_CODE
        return LoginResult(login.privateKey, mapper.transform(login.memberResponse), isUserPhoneVerified)
    }

    override fun createAccount(fields: NewAccountFields): Flow<Pair<Long, String>>  = flow {
        val regBody = registrationMapper.transform(fields)
        val response  = api.createAccount(registration = regBody)
        response.isSuccessOrThrowException()
        val member = response.data ?: throw BBError(response.code.toString(), response.message)
        emit(member.memberId to response.privateKey)
    }

    override suspend fun requestVerificationCode(
        userId: Long,
        userPhone: String
    ): RequestCodeResult {
        val response = api.requestVerificationCode(RequestCodeBody(userId.toString(), userPhone))

        if (response.code == TOO_MANY_REQUESTS_CODE) {
            return RequestCodeResult.TooManyRequests(response.message)
        }

        response.isSuccessOrThrowException()

        val nextRequestSmsTime = response.nextRequestSmsTime ?: throw BBError(response.code.toString(), response.message)
        val encodedData = response.encodedData ?: throw BBError(response.code.toString(), response.message)
        return RequestCodeResult.Success(
            response.message,
            RequestCodePayload(encodedData, nextRequestSmsTime)
        )
    }

    override suspend fun verifyPhoneNumber(data: VerificationPhoneData): VerificationNumberResult {
        val regBody = verifyPhoneNumberMapper.transform(data)
        val response = api.verifyPhoneNumber(regBody)
        if (response.code == WRONG_CODE_CODE) {
            return VerificationNumberResult.WrongCode(response.message)
        }
        response.isSuccessOrThrowException()
        return VerificationNumberResult.Success(response.message)
    }

    override suspend fun updatePhoneNumber(
        userId: Long,
        newPhone: String,
        oldPhone: String
    ): Boolean {
        val response = api.updatePhoneNumber(
            UpdatePhoneNumberBody(
                memberId = userId.toString(),
                newPhone = newPhone,
                oldPhone = oldPhone,
            )
        )
        response.isSuccessOrThrowException()
        return true
    }
}