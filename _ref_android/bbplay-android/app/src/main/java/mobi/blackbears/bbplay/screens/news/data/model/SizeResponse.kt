package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

data class SizeResponse(
    @SerializedName("height")
    val height: Long,

    @SerializedName("type")
    val type: SizeTypeResponse? = null,

    @SerializedName("width")
    val width: Long,

    @SerializedName("url")
    val url: String,

    @SerializedName("with_padding")
    val withPadding: Long? = null
)
