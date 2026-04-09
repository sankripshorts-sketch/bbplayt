package mobi.blackbears.bbplay.screens.events.data.model

import com.google.gson.annotations.SerializedName

enum class CodeTypeResponse(val code: Int) {
    @SerializedName("1")
    REWARD_RECEIVED(1),

    @SerializedName("2")
    REWARD_ALREADY_TAKEN(2),

    @SerializedName("3")
    REWARD_NOT_TAKEN(3),

    @SerializedName("4")
    REWARD_NOT_EXIST(4)
}