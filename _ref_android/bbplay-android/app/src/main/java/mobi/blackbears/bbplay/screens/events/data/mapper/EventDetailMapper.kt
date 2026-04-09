package mobi.blackbears.bbplay.screens.events.data.mapper

import mobi.blackbears.bbplay.common.extensions.parseToLocalDateTime
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.events.data.model.EventDetailResponse
import mobi.blackbears.bbplay.screens.events.data.model.EventStatusTypeResponse
import mobi.blackbears.bbplay.screens.events.domain.model.EventDetail
import mobi.blackbears.bbplay.screens.events.domain.model.EventStatusType
import timber.log.Timber
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import javax.inject.Inject

class EventDetailMapper @Inject constructor(): Mapper<EventDetailResponse, EventDetail> {
    override fun transform(data: EventDetailResponse): EventDetail = data.run {
        val startTimeUtc =
            eventStartTimeUtc.parseToLocalDateTime(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        val endTimeUtc =
            eventEndTimeUtc.parseToLocalDateTime(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))

        EventDetail(
            eventId = eventId,
            eventICafeId = eventICafeId,
            eventName = eventName,
            eventDescription = eventDescription,
            eventGameCode = eventGameCode,
            eventGameMode = eventGameMode,
            eventStartTimeUtc = startTimeUtc,
            eventEndTimeUtc = endTimeUtc,
            eventScoreType = eventScoreType,
            eventTopWinners = eventTopWinners,
            eventTopMatches = eventTopMatches,
            eventBonusAmount = eventBonusAmount,
            eventBonusCurrency = eventBonusCurrency,
            eventTicketPrice = eventTicketPrice,
            eventIsGlobal = eventIsGlobal,
            gameName = gameName,
            eventTimeShow = eventTimeShow,
            eventStatus = mapToEventStatusType(eventStatus),
            eventStartTimeShow = getEventStartLocalDateTime(startTimeUtc.year ,eventTimeShow),
            eventEndTimeShow = getEventEndLocalDateTime(endTimeUtc.year, eventTimeShow)
        )
    }

    private fun getEventStartLocalDateTime(year: Int, eventTimeShow: String): LocalDateTime {
        val startTime = eventTimeShow.split("-")
            .getOrNull(0)?.trim() ?: return LocalDateTime.MIN
        return getLocalDateTime("$year/$startTime")
    }

    private fun getEventEndLocalDateTime(year: Int, eventTimeShow: String): LocalDateTime {
        val startTime = eventTimeShow.split("-")
            .getOrNull(1)?.trim() ?: return LocalDateTime.MIN
        return getLocalDateTime("$year/$startTime")
    }

    private fun getLocalDateTime(text: String): LocalDateTime {
        val formatter = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm")
        return try {
            LocalDateTime.parse(text, formatter)
        } catch (e: DateTimeParseException) {
            Timber.e(e)
            LocalDateTime.MIN
        }
    }

    private fun mapToEventStatusType(data: EventStatusTypeResponse): EventStatusType =
        when(data) {
            EventStatusTypeResponse.UPCOMING -> EventStatusType.UPCOMING
            EventStatusTypeResponse.ACTIVE -> EventStatusType.ACTIVE
            EventStatusTypeResponse.NOT_ACTIVE -> EventStatusType.NOT_ACTIVE
        }
}