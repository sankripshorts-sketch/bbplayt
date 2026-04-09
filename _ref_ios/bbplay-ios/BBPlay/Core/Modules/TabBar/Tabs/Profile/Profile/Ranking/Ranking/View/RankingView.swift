import Foundation

protocol RankingView: AnyObject {
    func update(with games: [Game])
    func contentLoader(_ state: ContentLoaderState)
}
