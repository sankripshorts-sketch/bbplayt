package mobi.blackbears.bbplay.screens.clubs.data.network

import mobi.blackbears.bbplay.common.data.model.BBResponse
import mobi.blackbears.bbplay.screens.clubs.data.model.Data
import retrofit2.http.GET
import retrofit2.http.Path

interface ClubsApi {
    @GET("api/v2/cafe/{cafeId}/license/info")
    suspend fun getUserInfo(@Path("cafeId") cafeId: String): BBResponse<Data>
}