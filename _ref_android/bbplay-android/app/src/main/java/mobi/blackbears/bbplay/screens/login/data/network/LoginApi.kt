package mobi.blackbears.bbplay.screens.login.data.network

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.data.model.*
import mobi.blackbears.bbplay.screens.login.data.model.RegistrationBody
import mobi.blackbears.bbplay.screens.login.data.model.*
import retrofit2.http.*

interface LoginApi {

    @POST("login")
    suspend fun login(@Body params: LoginBody): ProxyBBResponse<String>


    @POST("api/v2/cafe/{cafeId}/members")
    suspend fun createAccount(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE,
        @Body registration: RegistrationBody
    ): ProxyBBResponse<MemberIdSuccess>

    @POST("requestsms")
    suspend fun requestVerificationCode(
        @Body params: RequestCodeBody
    ): ProxyBBResponse<Unit>

    @POST("verify")
    suspend fun verifyPhoneNumber(
        @Body params: VerifyPhoneNumberBody
    ): ProxyBBResponse<Unit>

    @POST("update")
    suspend fun updatePhoneNumber(
        @Body params: UpdatePhoneNumberBody
    ): ProxyBBResponse<Unit>
}