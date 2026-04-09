package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

data class AnswerResponse(
    @SerializedName("id")
    val id: Long,

    @SerializedName("rate")
    val rate: Double,

    @SerializedName("text")
    val text: String,

    @SerializedName("votes")
    val votes: Long
)