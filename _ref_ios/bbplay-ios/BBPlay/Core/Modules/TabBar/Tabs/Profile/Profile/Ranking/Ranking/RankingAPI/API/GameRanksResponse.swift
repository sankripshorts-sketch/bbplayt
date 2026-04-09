import Foundation

struct GameRanks: Hashable, Decodable {
    let gameCode: String
    let ranks: [GameRank]
    let result: Int
    let message: String

    enum CodingKeys: String, CodingKey {
        case gameCode = "game_code"
        case ranks
        case result
        case message
    }
}

struct GameRank: Hashable, Decodable {
    let rank: Int
    let playerName: String
    let wins: String?
    let losses: String?
    let kdr: StringOrNumberType?
    let kills: String
    let deaths: String?
    let assistsCSGO: String?
    let assist: String?
    let winRatio: StringOrNumberType?
    let points: StringOrNumberType

    enum CodingKeys: String, CodingKey {
        case rank
        case playerName = "player_name"
        case wins
        case losses
        case kdr
        case kills
        case deaths
        case assistsCSGO = "assists"
        case assist
        case winRatio = "win_ratio"
        case points
    }

    enum StringOrNumberType: Hashable, Decodable {
        case string(String)
        case int(Int)
        case double(Double)
        
        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            do {
                self = try .string(container.decode(String.self))
            } catch DecodingError.typeMismatch {
                do {
                    self = try .double(container.decode(Double.self))
                } catch DecodingError.typeMismatch {
                    do {
                        self = try .int(container.decode(Int.self))
                    }
                    catch {
                        throw DecodingError.typeMismatch(StringOrNumberType.self,
                                                         DecodingError.Context(codingPath: decoder.codingPath,
                                                                               debugDescription: "Encoded payload not of an expected type"))
                    }
                }
            }
        }
        
        func getValue() -> Double {
            switch self {
            case .int(let num):
                return Double(num)
            case .string(let num):
                return Double(num) ?? 0
            case .double(let num):
                return num
            }
        }
    }
}
