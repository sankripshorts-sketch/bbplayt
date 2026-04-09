package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

enum class AttachmentTypeResponse(val value: String) {
    @SerializedName("link")
    LINK("link"),

    @SerializedName("photo")
    PHOTO("photo"),

    @SerializedName("poll")
    POLL("poll"),

    @SerializedName("video")
    VIDEO("video")
}