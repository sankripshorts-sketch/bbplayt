import Foundation
import UIKit

final class CodeCheckingViewController: UIViewController {
    
    private let mainView = CodeCheckingViewImpl()
    private let presenter: CodeCheckingPresenter
    private let notificationCenter: NotificationCenter
    
    override func loadView() {
        view = mainView
    }
    
    init(presenter: CodeCheckingPresenter) {
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
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        setupNotifications()
        presenter.onViewWillAppear()
    }
    
    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        stopTimer()
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
private extension CodeCheckingViewController {
    func setActions() {
        mainView.setMainButtonAction { [weak self] code in
            self?.presenter.checkCode(code)
        }
        
        mainView.setTextFieldAction { [weak self] code in
            self?.presenter.textFieldIsValid(code)
        }
        
        mainView.setSendCodeAction { [weak self] in
            self?.presenter.requestSMS()
        }
    }
}

// MARK: - CodeChekingView -
extension CodeCheckingViewController: CodeChekingView {
    func showError(with message: String) {
        let alert = UIAlertController(
            title: Localizable.error(),
            message: message,
            preferredStyle: .alert
        )
        let action = UIAlertAction(
            title: Localizable.okey(),
            style: .default,
            handler: nil
        )
        alert.addAction(action)
        present(alert, animated: true, completion: nil)
    }
    
    func stopTimer() {
        mainView.stopTimerFromController()
    }
    
    func startTimer(_ nextRequestSMSTime: Int) {
        mainView.startTimerNext(nextRequestSMSTime)
    }
    
    func changeNumberInLabel(_ phone: String) {
        mainView.changeNumberInLabel(phone)
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
    
    func close() {
        navigationController?.popToRootViewController(animated: true)
    }
}
