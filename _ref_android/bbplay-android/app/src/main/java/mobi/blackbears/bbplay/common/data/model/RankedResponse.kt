package mobi.blackbears.bbplay.common.data.model

import com.google.gson.annotations.SerializedName

open class RankedResponse(
    @SerializedName("rank")
    val rank: Long = 0,

    @SerializedName("player_name")
    val playerName: String = "",

    @SerializedName("kills")
    val kills: String = "",
) {

    override fun toString(): String {
        return "RankedResponse(rank=$rank, playerName='$playerName', kills='$kills')"
    }
}

data class DotaLolOrValorantResponse(
    @SerializedName("wins")
    val wins: String,

    @SerializedName("losses")
    val losses: String,

    @SerializedName("kdr")
    val kdr: String,

    @SerializedName("deaths")
    val deaths: String,

    @SerializedName("points")
    val points: String,

    @SerializedName("assists", alternate = ["assist"])
    val assists: String,

    @SerializedName("win_ratio")
    val winRatio: String
) : RankedResponse()

data class CsGoResponse(
    @SerializedName("deaths")
    val deaths: String,

    @SerializedName("points")
    val points: String,

    @SerializedName("assists", alternate = ["assist"])
    val assists: String,
) : RankedResponse()

data class FortniteResponse(
    @SerializedName("wins")
    val wins: String,

    @SerializedName("points")
    val points: String,

    @SerializedName("top5s")
    val top5: String,

    @SerializedName("top10s")
    val top10: String,

    @SerializedName("top25s")
    val top25: String
) : RankedResponse()