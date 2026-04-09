import Foundation
import SnapKit

final class ProfileBonusRublesInfoAlert: BaseBottomSheetController {
    
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()
    private let mainButton = MainButton()
    
    init() {
        super.init(with: 333.scale())
        setupAction()
    }

    override func setupUI() {
        super.setupUI()

        setupTitle()
        setupDescriptionLabel()
        setupMainButton()
    }

    private func setupTitle() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 28.scaleIfNeeded()
        paragraphStyle.maximumLineHeight = 28.scaleIfNeeded()
        
        titleLabel.attributedText = NSAttributedString(
            string: Localizable.bonusRubles(),
            attributes: [
                .font: Font.dinRoundProBold(size: 28.scaleIfNeeded())!,
                .foregroundColor: UIColor.white,
                .paragraphStyle: paragraphStyle
            ])

        contentView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(41.scale())
            $0.centerX.equalToSuperview()
            $0.height.equalTo(28.scale())
        }
    }
    
    private func setupDescriptionLabel() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.maximumLineHeight = 20.scaleIfNeeded()
        paragraphStyle.minimumLineHeight = 20.scaleIfNeeded()

        descriptionLabel.attributedText = NSAttributedString(
            string: Localizable.descriptionBonusRublesAlert(),
            attributes: [
                .font: Font.dinRoundProMedi(size: 20.scaleIfNeeded())!,
                .foregroundColor: Color.commonText()!,
                .paragraphStyle: paragraphStyle
            ])

        descriptionLabel.numberOfLines = 0
        descriptionLabel.adjustsFontSizeToFitWidth = true
        
        contentView.addSubview(descriptionLabel)
        descriptionLabel.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(16.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
        }
    }

    private func setupMainButton() {
        mainButton.configure(title: Localizable.okey())
        contentView.addSubview(mainButton)
        mainButton.snp.makeConstraints {
            $0.top.equalTo(descriptionLabel.snp.bottom).offset(24.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalToSuperview().inset(43.scale() + UIView.safeAreaBottom)
            $0.height.equalTo(58.scale())
        }
    }
}

// MARK: - Setup Action -
extension ProfileBonusRublesInfoAlert {
    private func setupAction() {
        mainButton.setActionButton { [weak self] in
            self?.dismiss(animated: true)
        }
    }
}
