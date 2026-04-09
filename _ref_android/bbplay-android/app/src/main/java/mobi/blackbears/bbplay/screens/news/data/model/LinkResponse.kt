package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

data class LinkResponse(
    @SerializedName("url")
    val url: String,

    @SerializedName("description")
    val description: String?,

    @SerializedName("photo")
    val photo: PhotoResponse? = null,

    @SerializedName("title")
    val title: String,

    @SerializedName("target")
    val target: String? = null,

    @SerializedName("caption")
    val caption: String? = null
)
