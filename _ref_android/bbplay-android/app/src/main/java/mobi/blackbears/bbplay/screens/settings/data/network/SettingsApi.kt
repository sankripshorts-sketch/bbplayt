package mobi.blackbears.bbplay.screens.settings.data.network

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.data.model.BBResponse
import mobi.blackbears.bbplay.common.data.model.Data
import mobi.blackbears.bbplay.common.data.model.MemberIdSuccess
import mobi.blackbears.bbplay.screens.settings.data.model.PasswordFieldsBody
import retrofit2.http.*

interface SettingsApi {

    @GET("api/v2/cafe/{cafeId}/members/{memberId}")
    suspend fun getUserInfo(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE,
        @Path("memberId") memberId: Long
    ): BBResponse<Data>

    @PUT("api/v2/cafe/{cafeId}/members/{memberId}")
    suspend fun changePassword(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE,
        @Path("memberId") memberId: Long,
        @Body newPassword: PasswordFieldsBody
    ): BBResponse<MemberIdSuccess>

}

