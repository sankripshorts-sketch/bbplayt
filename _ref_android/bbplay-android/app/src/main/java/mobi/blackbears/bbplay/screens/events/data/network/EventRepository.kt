package mobi.blackbears.bbplay.screens.events.data.network

import mobi.blackbears.bbplay.screens.events.domain.model.CodeRewardType
import mobi.blackbears.bbplay.screens.events.domain.model.EventDetail
import mobi.blackbears.bbplay.screens.events.domain.model.EventOfClub

interface EventRepository {
    suspend fun getEventsOfClub(): List<EventDetail>

    suspend fun getDetailsEvent(eventId: String): EventOfClub

    suspend fun checkReward(memberId: String, eventId: String): CodeRewardType

    suspend fun getReward(
        memberId: Long,
        eventId: String,
        randomKey: String,
        key: String,
        rewardAmount: Int
    ): Boolean
}