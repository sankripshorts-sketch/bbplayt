package mobi.blackbears.bbplay.screens.booking.data.network

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.data.model.BBResponse
import mobi.blackbears.bbplay.common.data.model.Data
import mobi.blackbears.bbplay.screens.booking.data.model.*
import mobi.blackbears.bbplay.screens.booking.data.model.booking.BookingResponse
import mobi.blackbears.bbplay.screens.booking.data.model.booking.MakeBookingResponse
import mobi.blackbears.bbplay.screens.booking.data.model.booking.body.*
import retrofit2.http.*

interface BookingApi {

    @GET("api/v2/cafe/{cafeId}/prices")
    suspend fun getPriceFromHour(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE,
    ): BBResponse<List<PriceResponse>>

    @GET("api/v2/cafe/{cafeId}/products")
    suspend fun getProducts(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE,
    ): BBResponse<SpecialProductsResponse>

    @GET("api/v2/cafe/{cafeId}/license/info")
    suspend fun getClubInfo(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE,
    ): BBResponse<DataClubs>

    @GET("api/v2/cafe/{cafeId}/members/{memberId}")
    suspend fun getUserInfo(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE,
        @Path("memberId") memberId: Long
    ): BBResponse<Data>

    @GET("api/v2/cafe/{cafeId}/pcs/action/rooms")
    suspend fun getRooms(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE
    ): BBResponse<List<RoomResponse>>

    @GET("api/v2/cafe/{cafeId}/pcs/action/initData")
    suspend fun getListOfPcs(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE
    ): BBResponse<PcsInfoResponse>

    //region Бронирование
    @POST("booking")
    suspend fun makeBooking(@Body params: BookingBody): MakeBookingResponse

    @GET("api/v2/cafe/{cafeId}/bookings")
    suspend fun getAllBookings(
        @Path("cafeId") cafeId: String = BuildConfig.BBPLAY_ID_CAFE
    ): BBResponse<List<BookingResponse>>
    //endregion
}