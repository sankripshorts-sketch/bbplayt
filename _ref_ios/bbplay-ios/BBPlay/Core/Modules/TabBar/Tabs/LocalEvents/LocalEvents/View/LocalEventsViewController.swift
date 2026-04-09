import Foundation
import UIKit

final class LocalEventsViewController: UIViewController {
    
    private let mainView = LocalEventsViewImpl()
    private let presenter: LocalEventsPresenter
    
    init(presenter: LocalEventsPresenter) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
        setupActions()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override func loadView() {
        view = mainView
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        presenter.onViewDidAppear()
    }
    
    private func setupActions() {
        mainView.setCellAction { [unowned self] eventId in
            presenter.cellDidTap(with: eventId)
        }
        
        mainView.setPullToRefreshAction { [unowned self] in
            presenter.pullToRefreshTriggered()
        }
    }
}

extension LocalEventsViewController: LocalEventsView {
    func update(with events: LocalEvents) {
        mainView.update(with: events)
    }
    
    func contentLoader(_ state: ContentLoaderState) {
        state == .on ? navigationController?.activityIndicatorOn() : navigationController?.activityIndicatorOff()
    }
    
    func endRefreshing() {
        mainView.endRefreshing()
    }
}
