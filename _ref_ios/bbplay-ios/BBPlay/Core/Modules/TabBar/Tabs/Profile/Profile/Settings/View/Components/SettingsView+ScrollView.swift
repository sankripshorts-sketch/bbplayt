import Foundation
import UIKit
import SnapKit

extension SettingsView {
    final class ScrollView: UIScrollView {
        let changePasswordContainer = ChangePasswordContainer()
        private let personalInfoContainer = PersonalInfoContainer()
        private let removeAccountLabel = UILabel()
        
        private var removeAccountAction: EmptyClosure?
        
        override init(frame: CGRect) {
            super.init(frame: frame)
            setupAppearance()
        }
        
        @available(*, unavailable)
        required init?(coder: NSCoder) { nil }
        
        func update(with model: SettingsView.Model) {
            personalInfoContainer.update(with: model)
        }
        
        func hidePersonalInfo(isHidden: Bool) {
            personalInfoContainer.isHidden = isHidden
        }
        
        func setCheckTextFieldAction(_ action: @escaping ((String, String) -> Void)) {
            changePasswordContainer.setCheckTextFieldAction(action)
        }
        
        func setRemoveAccountAction(_ action: @escaping EmptyClosure) {
            self.removeAccountAction = action
        }
        
        private func setupAppearance() {
            isUserInteractionEnabled = true
            backgroundColor = Color.background()
            isScrollEnabled = true
            showsVerticalScrollIndicator = false
            contentInsetAdjustmentBehavior = .never
            contentInset.bottom = 10.scale()
            alwaysBounceVertical = false
            
            setupChangePasswordContainer()
            setupPersonalInfoContainer()
            setupRemoveAccountLabel()
        }
        
        private func setupChangePasswordContainer() {
            addSubview(changePasswordContainer)
            changePasswordContainer.snp.makeConstraints {
                $0.top.equalTo(contentLayoutGuide.snp.top)
                $0.left.equalTo(contentLayoutGuide.snp.left).inset(24.scale())
                $0.right.equalTo(contentLayoutGuide.snp.right).inset(24.scale())
            }
        }
        
        private func setupPersonalInfoContainer() {
            addSubview(personalInfoContainer)
            personalInfoContainer.snp.makeConstraints {
                $0.top.equalTo(changePasswordContainer.snp.bottom).offset(24.scale())
                $0.left.equalTo(contentLayoutGuide.snp.left).inset(24.scale())
                $0.right.equalTo(contentLayoutGuide.snp.right).inset(24.scale())
                $0.centerX.equalToSuperview()
            }
        }
        
        private func setupRemoveAccountLabel() {
            removeAccountLabel.isUserInteractionEnabled = true
            removeAccountLabel.addGestureRecognizer(
                UITapGestureRecognizer(
                    target: self,
                    action: #selector(removeAccountTap)
                )
            )
            removeAccountLabel.attributedText = NSAttributedString(
                string: Localizable.removeAccountAndPersonalInfo(),
                attributes: [
                    .underlineColor: Color.commonText()!,
                    .font: Font.dinRoundProBold(size: 16.scale())!,
                    .foregroundColor: Color.commonText()!,
                    .underlineStyle: NSUnderlineStyle.single.rawValue
                ]
            )
            
            addSubview(removeAccountLabel)
            removeAccountLabel.snp.makeConstraints {
                $0.top.equalTo(personalInfoContainer.snp.bottom).offset(19.scale())
                $0.centerX.equalToSuperview()
                $0.bottom.greaterThanOrEqualToSuperview().inset(14.scale())
                $0.height.equalTo(21.scale())
            }
        }
        
        @objc private func removeAccountTap() {
            removeAccountAction?()
        }
    }
}
