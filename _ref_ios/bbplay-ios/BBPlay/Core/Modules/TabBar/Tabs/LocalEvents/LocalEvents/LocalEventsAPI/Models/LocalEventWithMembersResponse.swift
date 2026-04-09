import Foundation

struct LocalEventWithMembersResponse: Decodable {
    let code: Int
    let message: String
    let data: LocalEventWithMembersDataResponse?
}

struct LocalEventWithMembersDataResponse: Decodable {
    let event: LocalEventWithMembersEventResponse
    let members: [LocalEventWithMembersMemberResponse]
    
    enum CodingKeys: String, CodingKey {
        case event, members
    }
}

struct LocalEventWithMembersEventResponse: Decodable {
    let eventId: String
    let eventIcafeId: Int
    let eventName: String
    let eventDescription: String
    let eventGameCode: String
    let eventGameMode: String
    let eventStartTimeUtc: String
    let eventEndTimeUtc: String
    let eventScoreType: String
    let eventTopWinners: Int
    let eventTopMatches: Int
    let eventBonusAmount: String
    let eventBonusCurrency: String
    let eventTicketPrice: String
    let eventIsGlobal: Int
    let eventUpdateTime: String
    let gameName: String
    let eventTimeShow: String
    let eventStatus: EventStatus
    
    enum CodingKeys: String, CodingKey {
        case eventId = "event_id"
        case eventIcafeId = "event_icafe_id"
        case eventName = "event_name"
        case eventDescription = "event_description"
        case eventGameCode = "event_game_code"
        case eventGameMode = "event_game_mode"
        case eventStartTimeUtc = "event_start_time_utc"
        case eventEndTimeUtc = "event_end_time_utc"
        case eventScoreType = "event_score_type"
        case eventTopWinners = "event_top_winners"
        case eventTopMatches = "event_top_matches"
        case eventBonusAmount = "event_bonus_amount"
        case eventBonusCurrency = "event_bonus_currency"
        case eventTicketPrice = "event_ticket_price"
        case eventIsGlobal = "event_is_global"
        case eventUpdateTime = "event_update_time"
        case gameName = "game_name"
        case eventTimeShow = "event_time_show"
        case eventStatus = "event_status"
    }
}

struct LocalEventWithMembersMemberResponse: Decodable {
    let ememberId: String
    let ememberEventId: String
    let ememberIcafeId: Int
    let ememberMemberAccount: String
    let ememberEmail: String
    let ememberMatches: Int
    let ememberPointMatches: Int
    let ememberPoint: Int
    let ememberWins: Int
    let ememberKills: Int
    let ememberAssists: Int
    let ememberDeaths: Int
    let ememberLasthits: Int
    let ememberGameTrackId: Int
    let ememberTicketAmount: String
    let ememberBonus: String
    let ememberBonusCoinAddress: String
    let ememberBonusPayStatus: Int
    let ememberBonusTradeId: String
    let ememberCreateTimeUtc: String
    let ememberRankScore: Int
    let ememberStatus: Int
    let ememberTelegramUsername: String
    let ememberRank: Int
    
    enum CodingKeys: String, CodingKey {
        case ememberId = "emember_id"
        case ememberEventId = "emember_event_id"
        case ememberIcafeId = "emember_icafe_id"
        case ememberMemberAccount = "emember_member_account"
        case ememberEmail = "emember_email"
        case ememberMatches = "emember_matches"
        case ememberPointMatches = "emember_point_matches"
        case ememberPoint = "emember_point"
        case ememberWins = "emember_wins"
        case ememberKills = "emember_kills"
        case ememberAssists = "emember_assists"
        case ememberDeaths = "emember_deaths"
        case ememberLasthits = "emember_lasthits"
        case ememberGameTrackId = "emember_game_track_id"
        case ememberTicketAmount = "emember_ticket_amount"
        case ememberBonus = "emember_bonus"
        case ememberBonusCoinAddress = "emember_bonus_coin_address"
        case ememberBonusPayStatus = "emember_bonus_pay_status"
        case ememberBonusTradeId = "emember_bonus_trade_id"
        case ememberCreateTimeUtc = "emember_create_time_utc"
        case ememberRankScore = "emember_rank_score"
        case ememberStatus = "emember_status"
        case ememberTelegramUsername = "emember_telegram_username"
        case ememberRank = "emember_rank"
    }
}

enum EventStatus: Int, Decodable {
    case will = 0
    case goes
    case completed
}
