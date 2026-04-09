package mobi.blackbears.bbplay.screens.events.data.mapper

import mobi.blackbears.bbplay.common.extensions.parseToLocalDateTime
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.events.data.model.EventDetailResponse
import mobi.blackbears.bbplay.screens.events.data.model.EventResponse
import mobi.blackbears.bbplay.screens.events.data.model.MemberOfEventResponse
import mobi.blackbears.bbplay.screens.events.domain.model.EventDetail
import mobi.blackbears.bbplay.screens.events.domain.model.EventOfClub
import mobi.blackbears.bbplay.screens.events.domain.model.MemberOfEvent
import java.time.format.DateTimeFormatter
import javax.inject.Inject

class EventOfClubMapper @Inject constructor(
    private val eventDetailMapper: Mapper<EventDetailResponse, EventDetail>
) : Mapper<EventResponse, EventOfClub> {
    override fun transform(data: EventResponse): EventOfClub = data.run {
        EventOfClub(
            event = eventDetailMapper.transform(event),
            members = members.map(::toMemberEvent)
        )
    }

    private fun toMemberEvent(data: MemberOfEventResponse): MemberOfEvent = data.run {
        MemberOfEvent(
            memberId = memberId,
            memberEventId = memberEventId,
            memberICafeId = memberICafeId,
            memberAccount = memberMemberAccount,
            memberEmail = memberEmail,
            memberMatches = memberMatches,
            memberPointMatches = memberPointMatches,
            memberPoint = memberPoint,
            memberWins = memberWINS,
            memberKills = memberKills,
            memberAssists = memberAssists,
            memberDeaths = memberDeaths,
            memberLastHits = memberLasthits,
            memberGameTrackId = memberGameTrackId,
            memberTicketAmount = memberTicketAmount,
            memberBonus = memberBonus,
            memberBonusCoinAddress = memberBonusCoinAddress,
            memberBonusPayStatus = memberBonusPayStatus,
            memberBonusTradeId = memberBonusTradeId,
            memberCreateTimeUtc = memberCreateTimeUtc.parseToLocalDateTime(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
            memberRankScore = memberRankScore,
            memberStatus = memberStatus,
            memberTelegramUsername = memberTelegramUsername,
            memberRank = memberRank
        )
    }
}