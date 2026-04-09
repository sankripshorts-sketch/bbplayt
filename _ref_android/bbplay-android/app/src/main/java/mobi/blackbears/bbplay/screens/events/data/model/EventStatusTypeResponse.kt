package mobi.blackbears.bbplay.screens.events.data.model

import com.google.gson.annotations.SerializedName

enum class EventStatusTypeResponse {
    @SerializedName("0")
    UPCOMING,

    @SerializedName("1")
    ACTIVE,

    @SerializedName("2")
    NOT_ACTIVE
}