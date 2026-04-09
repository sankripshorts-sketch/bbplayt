import Foundation

final class RankingModel {
    
    private let api = RankingNetworkAPI()
    
    func getGames() async throws -> [Game] {
        let games = await [
            try getGameModel(with: .csgo),
            try getGameModel(with: .dota2),
            try getGameModel(with: .fortnite),
            try getGameModel(with: .lol),
            try getGameModel(with: .valorant)
        ]
            .compactMap { $0 }
        
        guard !games.isEmpty else {
            throw AccountError.networkError
        }
        
        return games
    }
    
    private func getGameModel(with gameType: GameType) async throws -> Game? {
        do {
            let gameRanks = try await api.getGameRank(with: gameType.convertToString())
            return converter(with: gameType, and: gameRanks.ranks)
        }
        catch let error {
            logger.error("\(self), \(error)")
            return nil
        }
    }

    private func converter(
        with gameType: GameType,
        and ranks: [GameRank]
    ) -> Game {
        let rank = ranks.compactMap { rank -> Rank in
            return Rank(gameType: gameType,
                        rank: rank.rank,
                        playerName: rank.playerName,
                        wins: Int(rank.wins ?? "") ?? 0,
                        losses: Int(rank.losses ?? "") ?? 0,
                        kdr: Float(rank.kdr?.getValue() ?? 0.0),
                        kills: Int(rank.kills) ?? 0,
                        deaths: Int(rank.deaths ?? "") ?? 0,
                        assistsCSGO: Int(rank.assistsCSGO ?? "") ?? 0,
                        assist: Int(rank.assist ?? "") ?? 0,
                        winRatio: Float(rank.winRatio?.getValue() ?? 0.0),
                        points: Int(rank.points.getValue()))
        }
        return Game(gameType: gameType, ranks: rank)
    }
}
