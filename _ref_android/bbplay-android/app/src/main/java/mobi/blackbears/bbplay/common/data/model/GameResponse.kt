package mobi.blackbears.bbplay.common.data.model
import com.google.gson.annotations.SerializedName

data class GameResponse<T>(
    @SerializedName("game_code")
    val gameCode: String,

    @SerializedName("ranks")
    val ranks: List<T>,

    @SerializedName("result")
    val result: Long,

    @SerializedName("message")
    val message: String
)