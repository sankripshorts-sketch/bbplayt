import Foundation
import UIKit

protocol SettingsViewOutput {
    func saveButtonTap(oldPass: String?, newPass: String?)
    func cheсkSaveAction(oldPass: String?, newPass: String?)
    func logoutButtonTap()
    func keyboardShow()
    func keyboardHide()
    func onViewDidLoad()
    func removeAccountTap()
}

protocol SettingsViewInput: AnyObject {
    func dismiss()
    func keyboardShow()
    func keyboardHide()
    func hideContent(isHidden: Bool)
    func updateSavePasswordButtonState(isEnabled: Bool)
    func update(with model: SettingsView.Model)
    func contentLoader(_ state: ContentLoaderState)
    func openRemoveAccountAlert()
    func clearPasswordFields()
}

final class SettingsViewController: UIViewController {

    private let mainView = SettingsView()
    private let output: SettingsViewOutput
    
    override func loadView() {
        view = mainView
    }

    init(output: SettingsViewOutput) {
        self.output = output
        super.init(nibName: nil, bundle: nil)
        setActions()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        output.onViewDidLoad()
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillShow), name: UIResponder.keyboardWillShowNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillHide), name: UIResponder.keyboardWillHideNotification, object: nil)
    }
    
    @objc func keyboardWillShow(notification: NSNotification) {
        output.keyboardShow()
    }
    
    @objc func keyboardWillHide(notification: NSNotification) {
        output.keyboardHide()
    }

    private func setActions() {
        mainView.setSaveAction { [weak self] oldPass, newPass in
            self?.output.saveButtonTap(oldPass: oldPass, newPass: newPass)
        }

        mainView.setLogoutAction { [weak self] in
            self?.output.logoutButtonTap()
        }
        
        mainView.setCheckTextFieldAction { [weak self] oldPass, newPass in
            self?.output.cheсkSaveAction(oldPass: oldPass, newPass: newPass)
        }
        
        mainView.setRemoveAccountAction { [weak self] in
            self?.output.removeAccountTap()
        }
    }
    
    private func openAlertRemoveAccount() {
        let alert = UIAlertController(title: nil, message: Localizable.removeAccountQuestionAlert(), preferredStyle: .alert)
        let positiveAction = UIAlertAction(title: Localizable.removeAccountAnswerNo(), style: .cancel) { _ in
            alert.dismiss(animated: true)
        }
        let negativeAction = UIAlertAction(title: Localizable.removeAccountAnswerDelete(), style: .destructive) {
            [weak self] _ in
            alert.dismiss(animated: true) {
                self?.openInfoRemoveAccountAlert()
            }
        }
        alert.addAction(positiveAction)
        alert.addAction(negativeAction)
        present(alert, animated: true)
    }
    
    private func openInfoRemoveAccountAlert() {
        let alert = UIAlertController(title: nil, message: Localizable.removeAccountNegativeAlert(), preferredStyle: .alert)
        let action = UIAlertAction(title: Localizable.okey(), style: .default) { _ in
            alert.dismiss(animated: true)
        }
        alert.addAction(action)
        present(alert, animated: true)
    }

}

// MARK: - SettingsView -

extension SettingsViewController: SettingsViewInput {
    func updateSavePasswordButtonState(isEnabled: Bool) {
        mainView.updateSavePasswordButtonState(isEnabled: isEnabled)
    }
    
    func dismiss() {
        self.navigationController?.popViewController(animated: true)
    }
    
    func update(with model: SettingsView.Model) {
        mainView.update(with: model)
    }
    
    func keyboardShow() {
        mainView.keyboardShow()
    }
    
    func keyboardHide() {
        mainView.keyboardHide()
    }
    
    func hideContent(isHidden: Bool) {
        mainView.hideContent(isHidden: isHidden)
    }
    
    func contentLoader(_ state: ContentLoaderState) {
        state == .on ? navigationController?.activityIndicatorOn() : navigationController?.activityIndicatorOff()
    }
    
    func openRemoveAccountAlert() {
        openAlertRemoveAccount()
    }
    
    func clearPasswordFields() {
        mainView.clearPasswordFields()
    }

}
