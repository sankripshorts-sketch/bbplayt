import Foundation

final class RankingRouter: Router {
    func openLiderboard(with game: Game) {
        let viewController = makeLiderboardViewController(with: game)
        push(viewController)
        super.needShowNavigationBar()
    }

    private func makeLiderboardViewController(with game: Game) -> LeaderboardViewController {
        let router = LeaderboardRouter(navigationController: super.makeNavigationController())
        let presenter = LeaderboardPresenterImpl(router: router, game: game)
        let viewController = LeaderboardViewController(presenter: presenter)
        presenter.setView(viewController)
        return viewController
    }
}
