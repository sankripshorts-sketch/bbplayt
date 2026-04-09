package mobi.blackbears.bbplay.screens.events.data.network

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.data.model.BBResponse
import mobi.blackbears.bbplay.screens.events.data.model.*
import retrofit2.http.*

interface EventApi {
    @GET("api/v2/cafe/{cafeId}/events")
    suspend fun getEventsOfClub(
        @Path("cafeId") cafeId: String = BuildConfig.ID_CAFE_SECOND_CLUB
    ): BBResponse<List<EventDetailResponse>>

    @GET("api/v2/cafe/{cafeId}/events/{eventId}/detail")
    suspend fun getDetailsEvent(
        @Path("cafeId") cafeId: String = BuildConfig.ID_CAFE_SECOND_CLUB,
        @Path("eventId") eventId: String
    ): BBResponse<EventResponse>

    @POST("check-reward")
    suspend fun checkReward(@Body params: CheckRewardBody): CheckRewardResponse

    @POST("get-reward")
    suspend fun getReward(@Body params: GetRewardBody): CheckRewardResponse
}