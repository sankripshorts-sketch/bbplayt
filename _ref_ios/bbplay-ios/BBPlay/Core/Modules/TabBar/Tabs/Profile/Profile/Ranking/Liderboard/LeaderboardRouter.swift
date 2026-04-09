import Foundation

final class LeaderboardRouter: Router {
    func openSortBottomSheet(with currentSort: SortType, availableSort: [SortType], action: @escaping ((SortType) -> Void)) {
        let viewController = makeSortItemBottomSheet(with: currentSort, availableSort: availableSort, action: action)
        present(viewController, animated: true)
    }
    
    private func makeSortItemBottomSheet(with currentSort: SortType, availableSort: [SortType], action: @escaping ((SortType) -> Void)) -> SortItemBottomSheet {
        let viewController = SortItemBottomSheet(with: currentSort, availableSort: availableSort, action: action)
        return viewController
    }
}
