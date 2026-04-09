import Foundation

protocol RankingPresenter: AnyObject {
    func openGame(game: GameType)
    func onViewDidAppear()
    func onViewDidLoad()
}
