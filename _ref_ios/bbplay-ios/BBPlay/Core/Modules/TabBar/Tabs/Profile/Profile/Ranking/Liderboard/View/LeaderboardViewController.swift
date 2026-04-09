import Foundation
import UIKit

final class LeaderboardViewController: UIViewController {
    
    private let presenter: LeaderboardPresenter
    private let mainView = LeaderboardViewImpl()
    
    init(presenter: LeaderboardPresenter) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
        setupAction()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override func loadView() {
        view = mainView
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        presenter.onViewDidLoad()
    }
    
    private func setupAction() {
        mainView.setAction { [weak self] in
            guard let self = self else {
                return
            }
            self.presenter.openSortItemBottomSheet()
        }
    }
}

extension LeaderboardViewController: LeaderboardView {
    func update(with game: Game, sortType: SortType) {
        mainView.update(with: game, sortType: sortType)
    }
}
