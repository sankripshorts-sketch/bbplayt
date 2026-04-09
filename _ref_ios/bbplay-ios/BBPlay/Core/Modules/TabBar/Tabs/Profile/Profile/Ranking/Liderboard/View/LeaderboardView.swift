import Foundation

protocol LeaderboardView: AnyObject {
    func update(with game: Game, sortType: SortType)
}
