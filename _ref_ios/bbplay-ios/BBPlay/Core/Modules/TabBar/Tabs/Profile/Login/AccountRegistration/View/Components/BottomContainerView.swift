import Foundation
import UIKit
import SnapKit

// MARK: - BottomContainerView -

extension AccountRegistrationContentView {
    
    final class BottomContainerView: UIView {
        
        private let registrationButton = MainButton()
        
        private let labelContainer = UIStackView()
        private let questionLabel = UILabel()
        private let loginLabel = UILabel()
        
        private var loginAction: EmptyClosure?
        
        override init(frame: CGRect) {
            super.init(frame: frame)
            setupAppearance()
        }
        
        @available(*, unavailable)
        required init?(coder: NSCoder) { nil }
        
        func setLoginAction(_ action: @escaping EmptyClosure) {
            self.loginAction = action
        }
        
        func setRegistrationAction(_ action: @escaping EmptyClosure) {
            registrationButton.setActionButton(action)
        }
        
        func updateButton(_ isEnabled: Bool) {
            registrationButton.setEnable(isEnabled: isEnabled)
            registrationButton.layoutSubviews()
        }
        
        private func setupAppearance() {
            setupRegistrationButton()
            
            setupLabelContainer()
            setupQuestionLabel()
            setupLoginLabel()
        }
        
        private func setupLabelContainer() {
            labelContainer.isUserInteractionEnabled = true
            labelContainer.spacing = 9
            labelContainer.axis = .horizontal
            labelContainer.alignment = .fill
            
            addSubview(labelContainer)
            labelContainer.snp.makeConstraints {
                $0.top.equalTo(registrationButton.snp.bottom).offset(32.scale())
                $0.height.equalTo(26.scale())
                $0.centerX.bottom.equalToSuperview()
            }
        }
        
        private func setupQuestionLabel() {
            questionLabel.textColor = Color.commonText()
            questionLabel.font = Font.dinRoundProBold(size: 16.scale())
            questionLabel.text = Localizable.haveAccount()
            
            labelContainer.addArrangedSubview(questionLabel)
            questionLabel.snp.makeConstraints {
                $0.height.equalTo(26.scale())
            }
        }
        
        private func setupLoginLabel() {
            loginLabel.isUserInteractionEnabled = true
            loginLabel.attributedText = NSAttributedString(
                string: Localizable.login(),
                attributes: [
                    .font: Font.dinRoundProBold(size: 16.scale())!,
                    .foregroundColor: Color.greenText()!,
                    .underlineStyle: NSUnderlineStyle.single.rawValue,
                    .underlineColor: Color.greenText()!
                ])
            
            labelContainer.addArrangedSubview(loginLabel)
            questionLabel.snp.makeConstraints {
                $0.height.equalTo(26.scale())
            }

            let tap = UITapGestureRecognizer(target: self, action: #selector(loginButtonTap))
            loginLabel.addGestureRecognizer(tap)
        }
        
        private func setupRegistrationButton() {
            registrationButton.setEnable(isEnabled: false)
            registrationButton.configure(title: Localizable.createAccount())

            addSubview(registrationButton)
            registrationButton.snp.makeConstraints {
                $0.top.equalToSuperview()
                $0.left.right.equalToSuperview().inset(24.scale())
                $0.height.equalTo(58.scale())
            }
        }
        
        @objc private func loginButtonTap() {
            loginAction?()
        }
    }

}
