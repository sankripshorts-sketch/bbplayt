import Foundation

enum Place: Int {
    case first = 0
    case second
    case third
    case notPrize
}

final class LeaderboardPresenterImpl {
    
    private let currentSortKey = "currentSortKey"

    private weak var view: LeaderboardView?
    private let router: LeaderboardRouter
    private let game: Game
    private let defaultSortType: SortType = .kills
    private let storage = UserDefaults.standard

    // MARK: - Init
    init(router: LeaderboardRouter,
         game: Game) {
        self.router = router
        self.game = game
    }

    func setView(_ view: LeaderboardView) {
        self.view = view
    }

    private var currentSortType: SortType? {
        get {
            guard let index = storage.value(forKey: currentSortKey + "\(game.gameType.rawValue)") as? Int else { return nil }
            return SortType(rawValue: index)
        }
        set {
            storage.set(newValue?.rawValue, forKey: currentSortKey + "\(game.gameType.rawValue)")
        }
    }

    private func sortedRanks(with type: SortType) -> Game {
        var ranks = game.ranks
        
        switch type {
            case .assistants:
                ranks = game.gameType == .csgo ? ranks.sorted { $0.assistsCSGO > $1.assistsCSGO } : ranks.sorted { $0.assist > $1.assist }
            case .defeats:
                ranks = ranks.sorted { $0.losses > $1.losses }
            case .victories:
                ranks = ranks.sorted { $0.wins > $1.wins }
            case .KDR:
                ranks = game.ranks.sorted { $0.kdr > $1.kdr }
            case .kills:
                ranks = game.ranks.sorted  { $0.kills > $1.kills }
            case .deaths:
                ranks = game.ranks.sorted { $0.deaths > $1.deaths }
            case .points:
                ranks = game.ranks.sorted { $0.points > $1.points }
            case .winRatio:
                ranks = game.ranks.sorted { $0.winRatio > $1.winRatio } 
            case .none:
                assertionFailure()
                break
        }

        return Game(gameType: game.gameType, ranks: ranks)
    }

    // MARK: - Update
    private func update() {
        var currentSort: SortType = defaultSortType
        if let currentSortType = currentSortType {
            currentSort = currentSortType
        }

        view?.update(with: sortedRanks(with: currentSort), sortType: currentSort)
    }
}

// MARK: - LeaderboardPresenter -
extension LeaderboardPresenterImpl: LeaderboardPresenter {
    
    func openSortItemBottomSheet() {
        router.openSortBottomSheet(with: currentSortType ?? defaultSortType, availableSort: game.availableSortTypes) { [weak self] sortType in
            guard let self = self else { return }
            let newRanks = self.sortedRanks(with: sortType)
            self.currentSortType = sortType
            self.view?.update(with: newRanks, sortType: sortType)
            self.router.dismiss()
        }
    }

    func onViewDidLoad() {
        update()
    }
}
