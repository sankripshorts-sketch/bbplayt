package mobi.blackbears.bbplay.screens.events.domain.model

data class EventWithMembersAndReward(
    val event: EventDetail,
    val members: List<MemberOfEvent>,
    val isHaveReward: Boolean = false,
    val isParticipant: Boolean = false
)