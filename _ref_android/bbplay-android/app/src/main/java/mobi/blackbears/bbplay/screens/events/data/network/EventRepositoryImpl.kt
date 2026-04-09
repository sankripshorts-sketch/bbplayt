package mobi.blackbears.bbplay.screens.events.data.network

import mobi.blackbears.bbplay.common.data.model.getDataOrThrowException
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.events.data.model.*
import mobi.blackbears.bbplay.screens.events.domain.model.*
import javax.inject.Inject

class EventRepositoryImpl @Inject constructor(
    private val api: EventApi,
    private val eventDetailMapper: Mapper<EventDetailResponse, EventDetail>,
    private val eventOfClubMapper: Mapper<EventResponse, EventOfClub>,
    private val checkRewardMapper: Mapper<CheckRewardResponse, CodeRewardType>
): EventRepository {
    override suspend fun getEventsOfClub(): List<EventDetail> =
        api.getEventsOfClub().getDataOrThrowException().map(eventDetailMapper::transform)

    override suspend fun getDetailsEvent(eventId: String): EventOfClub {
        val event = api.getDetailsEvent(eventId = eventId).getDataOrThrowException()
        return eventOfClubMapper.transform(event)
    }

    override suspend fun checkReward(memberId: String, eventId: String): CodeRewardType {
        val response = api.checkReward(CheckRewardBody(memberId, eventId))
        return checkRewardMapper.transform(response)
    }

    override suspend fun getReward(
        memberId: Long,
        eventId: String,
        randomKey: String,
        key: String,
        rewardAmount: Int
    ): Boolean {
        val params = GetRewardBody(memberId.toString(), eventId, randomKey, key, rewardAmount)
        return api.getReward(params).code == CodeTypeResponse.REWARD_RECEIVED
    }
}