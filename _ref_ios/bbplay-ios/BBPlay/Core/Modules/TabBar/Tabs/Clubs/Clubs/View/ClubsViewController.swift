import Foundation
import UIKit

final class ClubsViewController: UIViewController {
    
    private let mainView = ClubsViewImpl()
    private var presenter: ClubsPresenter
    
    override func loadView() {
        view = mainView
    }
    
    init(presenter: ClubsPresenter) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
        setAction()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        presenter.onViewWillAppear()
    }
    
    private func setAction() {        
        mainView.setFeedbackAction { [weak self] in
            self?.presenter.feedbackButtonTap()
        }
    }
}

extension ClubsViewController: ClubsView {
    func updateView(with models: [ClubModel]) {
        mainView.updateView(with: models)
    }
    
    func contentLoader(_ state: ContentLoaderState) {
        state == .on ? navigationController?.activityIndicatorOn() : navigationController?.activityIndicatorOff()
    }
}
