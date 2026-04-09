import Foundation
import UIKit

final class VerificationPhoneViewController: UIViewController {
    
    private let mainView = VerificationPhoneViewImpl()
    private let presenter: VerificationPhonePresenter
    private let notificationCenter: NotificationCenter
    
    override func loadView() {
        view = mainView
    }
    
    init(presenter: VerificationPhonePresenter) {
        self.presenter = presenter
        self.notificationCenter = .default
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
        setupNotifications()
        presenter.onViewDidLoad()
        mainView.updateButton(true)
    }
    
    deinit {
        notificationCenter.removeObserver(self)
    }
    
    func setupNotifications() {
        notificationCenter.addObserver(
            self,
            selector: #selector(keyboardWillShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil)
        notificationCenter.addObserver(
            self,
            selector: #selector(keyboardWillHide),
            name: UIResponder.keyboardWillHideNotification,
            object: nil)
        
    }
    
    @objc func keyboardWillShow(notification: NSNotification) {
        let userInfo = notification.userInfo
        let keyboardFrameSize = userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect
        presenter.updateScrollPosition(with: keyboardFrameSize?.height ?? 0)
    }
    
    @objc func keyboardWillHide(notification: NSNotification) {
        presenter.resetScrollPosition()
    }
}

// MARK: - Private extension -
private extension VerificationPhoneViewController {
    private func setActions() {
        mainView.setTextFieldAction { [weak self] phone in
            self?.presenter.textFieldValid(phone)
        }
        
        mainView.setFurtherAction { [weak self] phone in
            self?.presenter.checkNumber(phone)
        }
    }
}

// MARK: - Public? -
extension VerificationPhoneViewController: VerificationPhoneView {
    func showError(with message: String) {
        let alert = UIAlertController(title: Localizable.error(), message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: Localizable.okey(),
                                      style: .default,
                                      handler: nil))
        present(alert, animated: true, completion: nil)
    }
    
    func updateTextField(_ phone: String) {
        mainView.updateTextField(phone)
    }

    func updateScrollPosition(with height: CGFloat) {
        mainView.updateScrollPosition(with: height)
    }
    
    func resetScrollPosition() {
        mainView.resetScrollPosition()
    }
    
    func updateButton(_ isEnable: Bool) {
        mainView.updateButton(isEnable)
    }
}
