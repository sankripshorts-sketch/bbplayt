package mobi.blackbears.bbplay.screens.profile.data.network

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.data.model.*
import retrofit2.http.*

interface ProfileApi {
    @GET("api/v2/cafe/{cafeId}/members/{memberId}")
    suspend fun getUserInfo(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE,
        @Path("memberId") memberId: Long
    ): BBResponse<Data>
}