package mobi.blackbears.bbplay.screens.events.data.model

import com.google.gson.annotations.SerializedName

data class MemberOfEventResponse(
    @SerializedName("emember_id")
    val memberId: String,

    @SerializedName("emember_event_id")
    val memberEventId: String,

    @SerializedName("emember_icafe_id")
    val memberICafeId: Long,

    @SerializedName("emember_member_account")
    val memberMemberAccount: String,

    @SerializedName("emember_email")
    val memberEmail: String,

    @SerializedName("emember_matches")
    val memberMatches: Long,

    @SerializedName("emember_point_matches")
    val memberPointMatches: Long,

    @SerializedName("emember_point")
    val memberPoint: Long,

    @SerializedName("emember_wins")
    val memberWINS: Long,

    @SerializedName("emember_kills")
    val memberKills: Long,

    @SerializedName("emember_assists")
    val memberAssists: Long,

    @SerializedName("emember_deaths")
    val memberDeaths: Long,

    @SerializedName("emember_lasthits")
    val memberLasthits: Long,

    @SerializedName("emember_game_track_id")
    val memberGameTrackId: Long,

    @SerializedName("emember_ticket_amount")
    val memberTicketAmount: String,

    @SerializedName("emember_bonus")
    val memberBonus: String,

    @SerializedName("emember_bonus_coin_address")
    val memberBonusCoinAddress: String,

    @SerializedName("emember_bonus_pay_status")
    val memberBonusPayStatus: Long,

    @SerializedName("emember_bonus_trade_id")
    val memberBonusTradeId: String,

    @SerializedName("emember_create_time_utc")
    val memberCreateTimeUtc: String,

    @SerializedName("emember_rank_score")
    val memberRankScore: Long,

    @SerializedName("emember_status")
    val memberStatus: Long,

    @SerializedName("emember_telegram_username")
    val memberTelegramUsername: String,

    @SerializedName("emember_rank")
    val memberRank: Long
)