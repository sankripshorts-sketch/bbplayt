import Foundation
import UIKit
import SnapKit

extension SettingsView.ScrollView {
    final class PersonalInfoContainer: UIStackView {
        private let personalInfoLabel = UILabel()
        private let nicknameTextField = InactiveTextField()
        private let phoneTextField = InactiveTextField()
        private let mailTextField = InactiveTextField()
        private let nameTextField = InactiveTextField()
        private let surnameTextField = InactiveTextField()
        private let dateOfBirthTextField = InactiveTextField()
        
        override init(frame: CGRect) {
            super.init(frame: frame)
            setupAppearance()
        }
        
        @available(*, unavailable)
        required init(coder: NSCoder) {
            fatalError("init(coder:) has not been implemented")
        }

        func update(with model: SettingsView.Model) {
            nicknameTextField.text = model.nickname
            phoneTextField.text = model.phone.formatPhoneNumber()
            
            mailTextField.isHidden = model.mail == nil || (model.mail?.isEmpty == true)
            mailTextField.text = model.mail
            
            nameTextField.text = model.name
            surnameTextField.text = model.surname
            dateOfBirthTextField.text = model.dateOfBirth
        }
        
        // MARK: - Private
        private func setupAppearance() {
            axis = .vertical
            spacing = 16.scale()

            setupPersonalInfoLabel()
            setupNicknameTextField()
            setupPhoneTextField()
            setupMailTextField()
            setupNameTextField()
            setupSurnameTextField()
            setupDateOfBirthTextField()
        }
        
        private func setupPersonalInfoLabel() {
            personalInfoLabel.textColor = Color.greenText()
            personalInfoLabel.font = Font.dinRoundProBold(size: 16.scale())
            personalInfoLabel.text = Localizable.personalInfo()
            
            addArrangedSubview(personalInfoLabel)
            personalInfoLabel.snp.makeConstraints {
                $0.height.equalTo(24.scale())
            }
        }
        
        private func setupNicknameTextField() {
            nicknameTextField.configure(
                with: Localizable.nickname(),
                type: .nickname
            )
            
            setCustomSpacing(8.scale(), after: personalInfoLabel)
            addArrangedSubview(nicknameTextField)
            
            nicknameTextField.snp.makeConstraints {
                $0.height.equalTo(58.scale())
            }
        }
        
        private func setupPhoneTextField() {
            phoneTextField.configure(
                with: Localizable.phone(),
                type: .phoneNumber
            )
            
            addArrangedSubview(phoneTextField)
            phoneTextField.snp.makeConstraints {
                $0.height.equalTo(58.scale())
            }
        }
        
        func setupMailTextField() {
            mailTextField.configure(
                with: Localizable.email(),
                type: .mail
            )
            
            addArrangedSubview(mailTextField)
            mailTextField.snp.makeConstraints {
                $0.height.equalTo(58.scale())
            }
        }
        
        private func setupNameTextField() {
            nameTextField.configure(
                with: Localizable.name(),
                type: .name
            )
            
            addArrangedSubview(nameTextField)
            nameTextField.snp.makeConstraints {
                $0.height.equalTo(58.scale())
            }
        }
        
        private func setupSurnameTextField() {
            surnameTextField.configure(
                with: Localizable.surname(),
                type: .surname
            )
            
            addArrangedSubview(surnameTextField)
            surnameTextField.snp.makeConstraints {
                $0.height.equalTo(58.scale())
            }
        }
        
        private func setupDateOfBirthTextField() {
            dateOfBirthTextField.configure(
                with: Localizable.dateOfBirth(),
                type: .dateOfBirth
            )
            
            addArrangedSubview(dateOfBirthTextField)
            dateOfBirthTextField.snp.makeConstraints {
                $0.height.equalTo(58.scale())
            }
        }
    }
}
