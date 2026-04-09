import Foundation
import UIKit

final class ProfileViewController: UIViewController {
    
    private let mainView = ProfileViewImpl()
    private let presenter: ProfilePresenter
    
    init(presenter: ProfilePresenter) {
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
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        navigationController?.navigationBar.isHidden = false
        navigationController?.setupSettingsRightItem(with: self, and: #selector(settingTap))
        presenter.onViewDidAppear()
    }
    
    private func setActions() {
        mainView.setBonusRublesAction { [weak self] in
            self?.presenter.openBonusRublesAlert()
        }
        
        mainView.setDepositButtonAction { [weak self] in
            self?.presenter.openReplenishScreen()
        }
        
        mainView.setLeaderbordAction { [weak self] in
            self?.presenter.goToRanking()
        }
        
        mainView.setRefreshAction { [weak self] in
            self?.presenter.refresh()
        }
    }
    
    @objc private func settingTap() {
        presenter.openSettings()
    }
    
    private func showErrorAlert(with description: String) {
        let alert = UIAlertController(title: Localizable.error(), message: description, preferredStyle: .alert)
        let action = UIAlertAction(title: Localizable.okey(), style: .destructive) { [weak self] _ in
            self?.presenter.needLogout()
        }
        alert.addAction(action)
        present(alert, animated: true)
    }
    
    private func showAlert(with description: String) {
        let alert = UIAlertController(title: Localizable.updateApp(), message: description, preferredStyle: .alert)
        let action = UIAlertAction(title: Localizable.okey(), style: .default) { [weak self] _ in
            self?.presenter.needLogout()
        }
        alert.addAction(action)
        present(alert, animated: true)
    }
}

extension ProfileViewController: ProfileView {
    func showError(with description: String) {
        showErrorAlert(with: description)
    }
    
    func showUpdateAlert(with description: String) {
        showAlert(with: description)
    }
    
    func update(with account: Account) {
        mainView.update(with: account)
    }

    func contentLoader(_ state: ContentLoaderState) {
        state == .on ? mainView.sceletonShow() : mainView.sceletonHide()
    }
    
    func endRefresh() {
        mainView.endRefresh()
    }
}
