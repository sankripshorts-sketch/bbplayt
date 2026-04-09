package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

data class VideoResponse(
    @SerializedName("access_key")
    val accessKey: String?,

    @SerializedName("can_comment")
    val canComment: Long,

    @SerializedName("can_like")
    val canLike: Long,

    @SerializedName("can_repost")
    val canRepost: Long,

    @SerializedName("can_subscribe")
    val canSubscribe: Long,

    @SerializedName("can_add_to_faves")
    val canAddToFaves: Long,

    @SerializedName("can_add")
    val canAdd: Long,

    @SerializedName("date")
    val date: Long,

    @SerializedName("description")
    val description: String,

    @SerializedName("duration")
    val duration: Long,

    @SerializedName("image")
    val image: List<SizeResponse>? = null,

    @SerializedName("first_frame")
    val firstFrame: List<SizeResponse>? = null,

    @SerializedName("width")
    val width: Long,

    @SerializedName("height")
    val height: Long,

    @SerializedName("id")
    val id: Long,

    @SerializedName("owner_id")
    val ownerID: Long,

    @SerializedName("title")
    val title: String,

    @SerializedName("track_code")
    val trackCode: String,

    @SerializedName("can_dislike")
    val canDislike: Long,

    @SerializedName("ov_id")
    val ovID: String? = null,

    @SerializedName("live_status")
    val liveStatus: String? = null
)
