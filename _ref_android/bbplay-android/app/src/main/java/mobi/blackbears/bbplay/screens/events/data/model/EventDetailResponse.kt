package mobi.blackbears.bbplay.screens.events.data.model

import com.google.gson.annotations.SerializedName

data class EventDetailResponse(
    @SerializedName("event_id")
    val eventId: String,

    @SerializedName("event_icafe_id")
    val eventICafeId: Long,

    @SerializedName("event_name")
    val eventName: String,

    @SerializedName("event_description")
    val eventDescription: String,

    @SerializedName("event_game_code")
    val eventGameCode: String,

    @SerializedName("event_game_mode")
    val eventGameMode: String,

    @SerializedName("event_start_time_utc")
    val eventStartTimeUtc: String,

    @SerializedName("event_end_time_utc")
    val eventEndTimeUtc: String,

    @SerializedName("event_score_type")
    val eventScoreType: String,

    @SerializedName("event_top_winners")
    val eventTopWinners: Long,

    @SerializedName("event_top_matches")
    val eventTopMatches: Long,

    @SerializedName("event_bonus_amount")
    val eventBonusAmount: String,

    @SerializedName("event_bonus_currency")
    val eventBonusCurrency: String,

    @SerializedName("event_ticket_price")
    val eventTicketPrice: String,

    @SerializedName("event_is_global")
    val eventIsGlobal: Long,

    @SerializedName("game_name")
    val gameName: String,

    @SerializedName("event_time_show")
    val eventTimeShow: String,

    @SerializedName("event_status")
    val eventStatus: EventStatusTypeResponse
)