import Foundation
import UIKit
import SnapKit

extension SettingsView.ScrollView {
    final class ChangePasswordContainer: UIView {
        private let changePasswordLabel = UILabel()
        private let oldPasswordTextField = MainTextField()
        private let newPasswordTextField = MainTextField()
        
        private var checkTextFieldAction: ((String, String) -> Void)?
        
        override init(frame: CGRect) {
            super.init(frame: frame)
            setupAppearance()
        }
        
        @available(*, unavailable)
        required init?(coder: NSCoder) { nil }
        
        func getOldPassword() -> String? {
            return oldPasswordTextField.text
        }
        
        func getNewPassword() -> String? {
            return newPasswordTextField.text
        }
        
        func setCheckTextFieldAction(_ action: @escaping ((String, String) -> Void)) {
            checkTextFieldAction = action
        }
        
        func hideTextField() {
            oldPasswordTextField.resignFirstResponder()
            newPasswordTextField.resignFirstResponder()
        }
        
        func clearPasswordFields() {
            newPasswordTextField.text = nil
            oldPasswordTextField.text = nil
        }
        
        private func setupAppearance() {
            setupChangePasswordLabel()
            setupOldPasswordTextField()
            setupNewPasswordTextField()
        }
        
        private func setupChangePasswordLabel() {
            changePasswordLabel.text = Localizable.changePassword()
            changePasswordLabel.textColor = Color.greenText()
            changePasswordLabel.font = Font.dinRoundProBold(size: 16.scale())
            
            addSubview(changePasswordLabel)
            changePasswordLabel.snp.makeConstraints {
                $0.top.left.right.equalToSuperview()
                $0.height.equalTo(24.scale())
            }
        }
        
        private func setupOldPasswordTextField() {
            oldPasswordTextField.configure(
                with: Localizable.oldPassword(),
                type: .password)
            oldPasswordTextField.setDelegate(self)
            
            addSubview(oldPasswordTextField)
            oldPasswordTextField.snp.makeConstraints {
                $0.top.equalTo(changePasswordLabel.snp.bottom).offset(8.scale())
                $0.left.right.equalToSuperview()
                $0.height.equalTo(58.scale())
            }
        }
        
        private func setupNewPasswordTextField() {
            newPasswordTextField.configure(
                with: Localizable.newPassword(),
                type: .password)
            newPasswordTextField.setDelegate(self)
            
            addSubview(newPasswordTextField)
            newPasswordTextField.snp.makeConstraints {
                $0.top.equalTo(oldPasswordTextField.snp.bottom).offset(16.scale())
                $0.left.right.bottom.equalToSuperview()
                $0.height.equalTo(58.scale())
            }
        }
    }
}

// MARK: - MainTextFieldDelegate -
extension SettingsView.ScrollView.ChangePasswordContainer: MainTextFieldDelegate {
    func actionTextInput() {
        guard let oldPass = oldPasswordTextField.text,
              let newPass = newPasswordTextField.text else {
            return
        }
        checkTextFieldAction?(oldPass, newPass)
    }
}
