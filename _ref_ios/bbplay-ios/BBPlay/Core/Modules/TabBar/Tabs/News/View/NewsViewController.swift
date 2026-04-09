import Foundation
import UIKit

final class NewsViewController: UIViewController {
    private let mainView = NewsViewImpl()
    private let presenter: NewsPresenter
    
    init(presenter: NewsPresenter) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
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
        setupActions()
    }
    
    private func setupActions() {
        mainView.setPostTapAction { [weak self] id in
            self?.presenter.postTap(with: id)
        }
        
        mainView.setPullToRefreshAction { [weak self] isRefreshing in
            self?.presenter.handlePullToRefresh(with: isRefreshing)
        }
    }
}

extension NewsViewController: NewsView {
    func showSkeleton() {
        mainView.showSkeleton()
    }
    
    func hideSkeleton() {
        mainView.hideSkeleton()
    }
    
    func update(with news: [NewsPost]) {
        mainView.update(with: news)
    }

    func openPost(postId: Int, ownerId: String) {
        guard let webVkURL = URL(string: "https://vk.com/bbplay__tmb?w=wall-\(ownerId)_\(postId)") else {
            logger.error("\(self) vk url missing")
            assertionFailure()
            return
        }
        UIApplication.shared.open(webVkURL, options: [:], completionHandler: nil)
    }
    
    func endRefreshing() {
        mainView.endRefreshing()
    }
}
