import Foundation
import UIKit

final class AccountRegistrationViewController: UIViewController {

    private let mainView = AccountRegistrationContentView()
    private let presenter: AccountRegistrationPresenter

    override func loadView() {
        view = mainView
    }

    init(presenter: AccountRegistrationPresenter) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
        setActions()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillShow), name: UIResponder.keyboardWillShowNotification, object: nil)
        
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillHide), name: UIResponder.keyboardWillHideNotification, object: nil)
    }

    private func setActions() {
        mainView.setRegistrationAction { [weak self] model in
            self?.presenter.createAccount(model)
        }

        mainView.setLoginAction { [weak self] in
            self?.navigationController?.popViewController(animated: true)
        }

        mainView.setTextFieldAction { [weak self] model in
            self?.presenter.textFieldIsValid(model)
        }
        
        mainView.setTermsOfUseAction { [weak self] in
            self?.presenter.openTermsOfUse()
        }
    }

    @objc func keyboardWillShow(notification: NSNotification) {
            presenter.updateScrollPosition()
    }
    
    @objc func keyboardWillHide(notification: NSNotification) {
            presenter.resetScrollPosition()
    }
}

extension AccountRegistrationViewController: AccountRegistrationView {
    
    func updateScrollPosition() {
        mainView.updateScrollPosition()
    }
    
    func resetScrollPosition() {
        mainView.resetScrollPosition()
    }
    
    func updateButton(_ isEnabled: Bool) {
        mainView.updateButton(isEnabled)
    }
    
    func showError(with message: String) {
        let alert = UIAlertController(title: Localizable.error(), message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: Localizable.okey(),
                                      style: .default,
                                      handler: nil))
        present(alert, animated: true, completion: nil)
    }
    
    func login(with nickname: String, and password: String) {
        navigationController?.popViewController(animated: true)
    }
    
    func contentLoader(_ state: ContentLoaderState) {
        state == .on ? navigationController?.activityIndicatorOn() : navigationController?.activityIndicatorOff()
    }

}
