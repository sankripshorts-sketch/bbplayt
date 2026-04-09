package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

data class VkResponse(
    @SerializedName("count")
    val count: Long,

    @SerializedName("items")
    val items: List<NewsResponse>
)