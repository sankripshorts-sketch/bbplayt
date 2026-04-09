import Foundation
import UIKit

final class RankingViewController: UIViewController {

    private var presenter: RankingPresenter
    private var mainView = RankingViewImpl()

    init(presenter: RankingPresenter) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
        setActions()
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

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        presenter.onViewDidAppear()
    }

    private func setActions() {
        mainView.setCellTapAction { [weak self] gameType in
            self?.presenter.openGame(game: gameType)
        }
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        guard let navVC = navigationController,
              !navVC.children.contains(where: { $0 is LeaderboardViewController }) else { return }
        contentLoader(.off)
    }
}

extension RankingViewController: RankingView {
    func update(with games: [Game]) {
        mainView.update(with: games)
    }

    func contentLoader(_ state: ContentLoaderState) {
        state == .on ? activityIndicatorOn() : activityIndicatorOff()
    }
}
