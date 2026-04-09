package mobi.blackbears.bbplay.screens.events.domain.model

data class EventOfClub(
    val event: EventDetail,
    val members: List<MemberOfEvent>
)