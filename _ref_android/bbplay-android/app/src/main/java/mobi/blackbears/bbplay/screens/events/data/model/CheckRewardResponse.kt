package mobi.blackbears.bbplay.screens.events.data.model

import com.google.gson.annotations.SerializedName

data class CheckRewardResponse(
    @SerializedName("code")
    val code: CodeTypeResponse,

    @SerializedName("message")
    val message: String
)