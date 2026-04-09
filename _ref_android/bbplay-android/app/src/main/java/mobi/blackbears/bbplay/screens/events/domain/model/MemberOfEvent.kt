package mobi.blackbears.bbplay.screens.events.domain.model

import java.time.LocalDateTime

data class MemberOfEvent(
    val memberId: String,
    val memberEventId: String,
    val memberICafeId: Long,
    val memberAccount: String,
    val memberEmail: String,
    val memberMatches: Long,
    val memberPointMatches: Long,
    val memberPoint: Long,
    val memberWins: Long,
    val memberKills: Long,
    val memberAssists: Long,
    val memberDeaths: Long,
    val memberLastHits: Long,
    val memberGameTrackId: Long,
    val memberTicketAmount: String,
    val memberBonus: String,
    val memberBonusCoinAddress: String,
    val memberBonusPayStatus: Long,
    val memberBonusTradeId: String,
    val memberCreateTimeUtc: LocalDateTime,
    val memberRankScore: Long,
    val memberStatus: Long,
    val memberTelegramUsername: String,
    val memberRank: Long
)