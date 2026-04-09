package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

data class PhotoResponse(
    @SerializedName("album_id")
    val albumID: Long,

    @SerializedName("date")
    val date: Long,

    @SerializedName("id")
    val id: Long,

    @SerializedName("owner_id")
    val ownerID: Long,

    @SerializedName("sizes")
    val sizes: List<SizeResponse>,

    @SerializedName("text")
    val text: String,

    @SerializedName("user_id")
    val userID: Long? = null,

    @SerializedName("has_tags")
    val hasTags: Boolean,

    @SerializedName("access_key")
    val accessKey: String? = null,

    @SerializedName("post_id")
    val postID: Long? = null
)