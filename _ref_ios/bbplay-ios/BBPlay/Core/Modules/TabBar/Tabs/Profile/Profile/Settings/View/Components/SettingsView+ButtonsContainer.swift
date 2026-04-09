import Foundation
import UIKit
import SnapKit

extension SettingsView {
    final class ButtonsContainer: UIView {
        private let savePasswordButton = MainButton()
        private let logoutButton = UILabel()
        private let versionLabel = UILabel()
    
        private var logoutAction: EmptyClosure?
        
        override init(frame: CGRect) {
            super.init(frame: frame)
            setupAppearance()
        }
        
        @available(*, unavailable)
        required init?(coder: NSCoder) { nil }
        
        func updateVersionLabel(text: String?) {
            versionLabel.text = text
            versionLabel.isHidden = text == nil
        }
        
        func updateSavePasswordButtonState(isEnabled: Bool) {
            savePasswordButton.setEnable(isEnabled: isEnabled)
            savePasswordButton.layoutSubviews()
        }
        
        func moveUpSaveButton(to view: UIView) {
            savePasswordButton.snp.remakeConstraints {
                $0.top.equalTo(view.snp.bottom).offset(32.scale())
                $0.left.right.equalToSuperview().inset(24.scale())
                $0.height.equalTo(58.scale())
            }
            
            logoutButton.snp.remakeConstraints {
                $0.top.centerX.equalToSuperview()
                $0.height.equalTo(28.scale())
            }
        }
        
        func moveDownSaveButton() {
            savePasswordButton.snp.remakeConstraints {
                $0.top.equalToSuperview()
                $0.horizontalEdges.equalToSuperview().inset(24.scale())
                $0.height.equalTo(58.scale())
            }
            
            logoutButton.snp.remakeConstraints {
                $0.top.equalTo(savePasswordButton.snp.bottom).offset(16.scale())
                $0.centerX.equalToSuperview()
                $0.height.equalTo(28.scale())
            }
        }
        
        func setVisibleOnlySaveButton(isVisible: Bool) {
            logoutButton.isHidden = !isVisible
            versionLabel.isHidden = !isVisible
        }
        
        func setSavePasswordButtonAction(_ action: @escaping EmptyClosure) {
            savePasswordButton.setActionButton(action)
        }
        
        func setLogoutAction(_ action: @escaping EmptyClosure) {
            self.logoutAction = action
        }
        
        private func setupAppearance() {
            setupSaveButton()
            setupLogoutButton()
            setupVersionLabel()
        }
        
        private func setupSaveButton() {
            savePasswordButton.configure(
                title: Localizable.save())
            savePasswordButton.setEnable(isEnabled: false)
            
            addSubview(savePasswordButton)
            savePasswordButton.snp.makeConstraints {
                $0.top.equalToSuperview()
                $0.horizontalEdges.equalToSuperview().inset(24.scale())
                $0.height.equalTo(58.scale())
            }
        }
        
        private func setupLogoutButton() {
            logoutButton.isUserInteractionEnabled = true
            logoutButton.attributedText = NSAttributedString(
                string: Localizable.exit(),
                attributes: [
                    .font: Font.dinRoundProBold(size: 22.scale())!,
                    .foregroundColor: Color.redText()!,
                    .underlineStyle: NSUnderlineStyle.single.rawValue,
                    .underlineColor: Color.redText()!
                ])
            
            addSubview(logoutButton)
            logoutButton.snp.makeConstraints {
                $0.top.equalTo(savePasswordButton.snp.bottom).offset(16.scale())
                $0.centerX.equalToSuperview()
                $0.height.equalTo(28.scale())
            }
            
            let tap = UITapGestureRecognizer(target: self, action: #selector(logoutButtonTap))
            logoutButton.addGestureRecognizer(tap)
        }
        
        private func setupVersionLabel() {
            versionLabel.textColor = Color.commonText()
            versionLabel.font = Font.dinRoundProBold(size: 16.scale())
            versionLabel.textAlignment = .center
            addSubview(versionLabel)
            versionLabel.snp.makeConstraints {
                $0.top.equalTo(logoutButton.snp.bottom).offset(20.scale())
                $0.horizontalEdges.equalToSuperview()
                $0.bottom.equalToSuperview().inset(21.scale())
                $0.height.equalTo(26.scale())
            }
        }
        
        @objc private func logoutButtonTap() {
            logoutAction?()
        }
    }
}
