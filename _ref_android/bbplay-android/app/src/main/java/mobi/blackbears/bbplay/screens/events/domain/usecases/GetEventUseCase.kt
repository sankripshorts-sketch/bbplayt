package mobi.blackbears.bbplay.screens.events.domain.usecases

import mobi.blackbears.bbplay.screens.events.domain.model.*

interface GetEventUseCase {
    suspend fun getEventsOfClub(): List<EventDetail>

    suspend fun getDetailsEvent(eventId: String): EventOfClub

    suspend fun getEventsWithPlayers(): List<EventOfClub>

    suspend fun checkReward(memberId: String, eventId: String): CodeRewardType

    suspend fun isHaveReward(memberId: Long, eventId: String): Boolean

    suspend fun getEventsWithCheckRewardUser(
        events: List<EventOfClub>,
        memberId: Long,
        userAccount: String
    ): List<EventWithMembersAndReward>

    suspend fun getReward(
        memberId: Long,
        eventId: String,
        privateKey: String,
        rewardAmount: Int
    ): Boolean
}