package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

data class AttachmentResponse(
    @SerializedName("type")
    val type: AttachmentTypeResponse,

    @SerializedName("photo")
    val photo: PhotoResponse? = null,

    @SerializedName("link")
    val link: LinkResponse? = null,

    @SerializedName("video")
    val video: VideoResponse? = null,

    @SerializedName("poll")
    val pollResponse: PollResponse? = null
)