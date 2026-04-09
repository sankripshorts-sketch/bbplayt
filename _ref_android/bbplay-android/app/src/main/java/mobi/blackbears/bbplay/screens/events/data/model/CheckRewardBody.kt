package mobi.blackbears.bbplay.screens.events.data.model

import com.google.gson.annotations.SerializedName

data class CheckRewardBody(
    @SerializedName("client_id")
    val clientId: String,

    @SerializedName("event_id")
    val eventId: String
)