package mobi.blackbears.bbplay.screens.events.domain.model

import java.time.LocalDateTime

data class EventDetail(
    val eventId: String,
    val eventICafeId: Long,
    val eventName: String,
    val eventDescription: String,
    val eventGameCode: String,
    val eventGameMode: String,
    val eventStartTimeUtc: LocalDateTime,
    val eventEndTimeUtc: LocalDateTime,
    val eventScoreType: String,
    val eventTopWinners: Long,
    val eventTopMatches: Long,
    val eventBonusAmount: String,
    val eventBonusCurrency: String,
    val eventTicketPrice: String,
    val eventIsGlobal: Long,
    val gameName: String,
    val eventTimeShow: String,
    val eventStatus: EventStatusType,
    val eventStartTimeShow: LocalDateTime,
    val eventEndTimeShow: LocalDateTime
)