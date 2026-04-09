package mobi.blackbears.bbplay.screens.events.domain.usecases

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.extensions.encodeStringToMD5
import mobi.blackbears.bbplay.common.extensions.getRandomString
import mobi.blackbears.bbplay.screens.events.data.network.EventRepository
import mobi.blackbears.bbplay.screens.events.domain.model.*
import javax.inject.Inject

class GetEventUseCaseImpl @Inject constructor(
    private val repository: EventRepository
): GetEventUseCase {
    override suspend fun getEventsOfClub(): List<EventDetail> =
        repository.getEventsOfClub()

    override suspend fun getDetailsEvent(eventId: String): EventOfClub =
        repository.getDetailsEvent(eventId)

    override suspend fun getEventsWithPlayers(): List<EventOfClub> =
        repository.getEventsOfClub()
            .map { repository.getDetailsEvent(it.eventId) }

    override suspend fun checkReward(memberId: String, eventId: String): CodeRewardType =
        repository.checkReward(memberId, eventId)

    override suspend fun isHaveReward(memberId: Long, eventId: String): Boolean {
        val checkReward = checkReward(memberId.toString(), eventId)
        return checkReward == CodeRewardType.REWARD_NOT_TAKEN
                || checkReward == CodeRewardType.REWARD_NOT_EXIST
    }

    override suspend fun getEventsWithCheckRewardUser(
        events: List<EventOfClub>,
        memberId: Long,
        userAccount: String,
    ): List<EventWithMembersAndReward> =
        events.map {
            val member = it.members.find { member -> member.memberAccount == userAccount }
            val isParticipant = member != null
            val isHaveReward = if (isParticipant)
                isHaveReward(memberId, it.event.eventId)
            else
                false
            EventWithMembersAndReward(
                event = it.event,
                members = it.members,
                isParticipant = isParticipant,
                isHaveReward = isHaveReward
            )
        }

    override suspend fun getReward(
        memberId: Long,
        eventId: String,
        privateKey: String,
        rewardAmount: Int
    ): Boolean {
        val randomKey = getRandomString()
        val md5 = "$memberId$randomKey$privateKey${BuildConfig.SECRET_KEY}".encodeStringToMD5()
        return repository.getReward(memberId, eventId, randomKey, md5, rewardAmount)
    }
}