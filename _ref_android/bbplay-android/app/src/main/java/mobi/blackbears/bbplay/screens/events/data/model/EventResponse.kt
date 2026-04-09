package mobi.blackbears.bbplay.screens.events.data.model

import com.google.gson.annotations.SerializedName

data class EventResponse(
    @SerializedName("event")
    val event: EventDetailResponse,

    @SerializedName("members")
    val members: List<MemberOfEventResponse>,
)
