import Foundation
import UIKit

enum GameType: Int, CaseIterable {
    case csgo = 0
    case fortnite
    case lol
    case valorant
    case dota2
    case all
}

extension GameType {
    func convertToString() -> String {
        switch self {
            case .csgo: return "csgo"
            case .fortnite: return "fortnite"
            case .lol: return "lol"
            case .valorant: return "valorant"
            case .dota2: return "dota2"
            case .all: return "all"
        }
    }
    
    static func getGameType(with gameCode: String) -> GameType? {
        switch gameCode {
            case "csgo": return .csgo
            case "fortnite": return .fortnite
            case "lol": return .lol
            case "valorant": return .valorant
            case "dota2": return .dota2
            case "all": return .all
            default:
                logger.error("No getted game by gameCode: \(gameCode)")
                return nil
        }
    }
    
    var gameTitle: String {
        switch self {
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
    
    var image: UIImage? {
        return UIImage(named: "\(self.convertToString()).png")
    }
    
    var imageForHeader: UIImage? {
        return UIImage(named: "\(self.convertToString())Header.png")
    }
}

final class RankingPresenterImpl {
    private weak var view: RankingView?
    private let router: RankingRouter
    private let model = RankingModel()
    
    private var games = [Game]()
    private var isLoaded = false
    
    init(router: RankingRouter) {
        self.router = router
    }
    
    func setView(_ view: RankingView) {
        self.view = view
    }

    private func getGameRankInfo() {
        Task {
            do {
                games = try await model.getGames()
                await MainActor.run {
                    isLoaded = true
                    view?.update(with: games)
                    view?.contentLoader(.off)
                }
            }
            catch let error {
                logger.error("\(self), with \(error)")
            }
        }
    }
    
    private func displayLoaderIfNeeded() {
        guard !isLoaded else { return }
        view?.contentLoader(.on)
    }
}

extension RankingPresenterImpl: RankingPresenter {
    func onViewDidAppear() {
        getGameRankInfo()
    }
    
    func onViewDidLoad() {
        displayLoaderIfNeeded()
    }

    func openGame(game gameType: GameType) {
        guard let game = games.first(where: { gameType.rawValue == $0.gameType.rawValue }) else { return }
        router.openLiderboard(with: game)
    }
}
