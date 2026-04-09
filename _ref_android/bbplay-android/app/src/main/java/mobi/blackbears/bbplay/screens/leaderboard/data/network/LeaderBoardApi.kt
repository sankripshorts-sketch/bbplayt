package mobi.blackbears.bbplay.screens.leaderboard.data.network

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.data.model.CsGoResponse
import mobi.blackbears.bbplay.common.data.model.DotaLolOrValorantResponse
import mobi.blackbears.bbplay.common.data.model.FortniteResponse
import mobi.blackbears.bbplay.common.data.model.GameResponse
import retrofit2.http.*

interface LeaderBoardApi {

    @GET("rank.php?action=ajax_rank_data")
    suspend fun getCsGoGame(
        @Query("code") gameName:String,
        @Query("icafe_id") cafeId: String = BuildConfig.BBPLAY_ID_CAFE
    ): GameResponse<CsGoResponse>

    @GET("rank.php?action=ajax_rank_data")
    suspend fun getFortniteGame(
        @Query("code") gameName:String,
        @Query("icafe_id") cafeId: String = BuildConfig.BBPLAY_ID_CAFE
    ): GameResponse<FortniteResponse>

    @GET("rank.php?action=ajax_rank_data")
    suspend fun getDotaLolOrValorantGame(
        @Query("code") gameName:String,
        @Query("icafe_id") cafeId: String = BuildConfig.BBPLAY_ID_CAFE
    ): GameResponse<DotaLolOrValorantResponse>
}