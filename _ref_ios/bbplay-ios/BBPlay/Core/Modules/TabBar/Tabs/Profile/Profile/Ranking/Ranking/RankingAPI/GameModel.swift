import Foundation
import UIKit

struct Game: Hashable {
    let gameType: GameType
    var ranks: [Rank]

    var gameTitle: String {
        switch gameType {
            case .csgo: return Localizable.csgo()
            case .fortnite: return Localizable.fortnite()
            case .lol: return Localizable.lol()
            case .valorant: return Localizable.valorant()
            case .dota2: return Localizable.dota2()
            case .all:
                return String(format: "%@, %@, %@, %@, %@",
                              Localizable.csgo(),
                              Localizable.fortnite(),
                              Localizable.lol(),
                              Localizable.valorant(),
                              Localizable.dota2())
        }
    }

    var availableSortTypes: [SortType] {
        switch gameType {
            case .csgo: return [.kills, .deaths, .assistants, .points]
            case .fortnite: return [.victories, .kills, .points]
            case .lol: return [.victories, .defeats, .KDR, .kills, .deaths, .assistants, .winRatio, .points]
            case .valorant: return [.victories, .defeats, .KDR, .kills, .deaths, .assistants, .winRatio, .points]
            case .dota2: return [.victories, .defeats, .KDR, .kills, .deaths, .assistants, .winRatio, .points]
            case .all:
                return []
        }
    }
}

struct Rank: Hashable {
    let gameType: GameType
    let rank: Int
    let playerName: String
    let wins: Int
    let losses: Int
    let kdr: Float
    let kills: Int
    let deaths: Int
    let assistsCSGO: Int
    let assist: Int
    let winRatio: Float
    let points: Int
}
