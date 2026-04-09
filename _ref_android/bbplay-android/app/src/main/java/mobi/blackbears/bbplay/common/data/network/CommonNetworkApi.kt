package mobi.blackbears.bbplay.common.data.network

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.data.model.BBResponse
import mobi.blackbears.bbplay.common.data.model.Data
import retrofit2.http.GET
import retrofit2.http.Path

interface CommonNetworkApi {
    @GET("api/v2/cafe/{cafeId}/members/{memberId}")
    suspend fun getUserInfo(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE,
        @Path("memberId") memberId: Long
    ): BBResponse<Data>
}