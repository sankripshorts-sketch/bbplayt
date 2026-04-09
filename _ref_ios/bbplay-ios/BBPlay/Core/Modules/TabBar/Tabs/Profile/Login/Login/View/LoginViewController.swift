import Foundation
import UIKit

final class LoginViewController: UIViewController {
    
    private let mainView = LoginViewImpl()
    private let presenter: LoginPresenter
    
    override func loadView() {
        view = mainView
    }

    init(presenter: LoginPresenter) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
        setActions()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override func viewDidLoad() {
         super.viewDidLoad()
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillShow), name: UIResponder.keyboardWillShowNotification, object: nil)
        
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillHide), name: UIResponder.keyboardWillHideNotification, object: nil)
    }
    
    private func setActions() {
        mainView.setRegistrationAction { [weak self] in
            self?.presenter.registrationButtonTap()
        }
        
        mainView.setRecoveryPasswordAction { [weak self] in
            self?.presenter.openRecoveryPasswordAlert()
        }
        
        mainView.setBackgroundAction { [weak self] in
            self?.presenter.backgroundTap()
        }
        
        mainView.setLoginAction { [weak self] nickname, password in
            self?.presenter.login(with: nickname, password)
        }
    
        mainView.setTextFieldValidationAction { [weak self] nickname, password in
            self?.presenter.textFieldIsValid(nickname, password)
        }
    }
}

extension LoginViewController: LoginView {
    func resignResponders() {
        mainView.resignResponders()
    }
    
    func updateButton(_ isEnabled: Bool) {
        mainView.updateButton(isEnabled)
    }
    
    @objc func keyboardWillShow(notification: NSNotification) {
        presenter.contentUp()
    }
    
    @objc func keyboardWillHide(notification: NSNotification) {
        presenter.contentDown()
    }
    
    func contentUp() {
        mainView.contentUp()
    }
    
    func contentDown() {
        mainView.contentDown()
    }
}
