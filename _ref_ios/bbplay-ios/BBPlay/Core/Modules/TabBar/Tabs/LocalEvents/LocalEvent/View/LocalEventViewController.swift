import Foundation
import UIKit

final class LocalEventViewController: UIViewController {
    
    private let mainView = LocalEventViewImpl()
    private let presenter: LocalEventPresenter
    
    init(presenter: LocalEventPresenter) {
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
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        presenter.onViewWillAppear()
    }
    
    private func setupActions() {
        mainView.setConnectEventAction { [unowned self] in
            presenter.connectEventButtonTapped()
        }
        
        mainView.setEventButtonAction { [unowned self] in
            presenter.eventButtonTapped()
        }
        
        mainView.setPullToRefreshAction { [unowned self] in
            presenter.pullToRefreshTriggered()
        }
    }
    
    private func dismiss() {
        navigationController?.popViewController(animated: true)
    }
}

// MARK: - LocalEventView -
extension LocalEventViewController: LocalEventView {
    func update(with event: LocalEvent<Section<Header, Item>>) {
        mainView.update(with: event)
    }
    
    func updateBottomView(with state: LocalEventBottomView.StateView,
                          description: String?,
                          title: String?) {
        mainView.updateBottomView(with: state,
                                  description: description,
                                  title: title)
    }
    
    func showErrorAlert(with description: String) {
        showDefaultAlert(description: description)
    }
    
    func showSuccessAlert(with description: String) {
        showDefaultAlert(with: Localizable.success(),
                         description: description) { [weak self] _ in
            self?.dismiss()
        }
    }
    
    func updateBottomButton(isEnabled: Bool) {
        mainView.updateBottomButton(isEnabled: isEnabled)
    }
    
    func endRefreshing() {
        mainView.endRefreshing()
    }
}
