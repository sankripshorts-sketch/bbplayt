import Foundation
import SnapKit

final class RecoveryPasswordAlert: BaseBottomSheetController {
    
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()
    private let mainButton = MainButton()
    
    init() {
        super.init(with: 401.scale())
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
            string: Localizable.passwordRecoveryTitle(),
            attributes: [
                .font: Font.dinRoundProBold(size: 28.scaleIfNeeded())!,
                .foregroundColor: UIColor.white,
                .paragraphStyle: paragraphStyle
        ])

        titleLabel.numberOfLines = 0
        titleLabel.textAlignment = .center
        
        contentView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(49.scale())
            $0.centerX.equalToSuperview()
            $0.height.equalTo(56.scale())
        }
    }
    
    private func setupDescriptionLabel() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.94
        paragraphStyle.minimumLineHeight = 20.scaleIfNeeded()
        paragraphStyle.maximumLineHeight = 20.scaleIfNeeded()

        descriptionLabel.attributedText = NSAttributedString(
            string: Localizable.passwordRecoveryDescription(),
            attributes: [
                .font: Font.dinRoundProMedi(size: 20.scaleIfNeeded())!,
                .foregroundColor: Color.alertDescriptionText()!,
                .paragraphStyle: paragraphStyle
            ])
        
        descriptionLabel.numberOfLines = 0
        descriptionLabel.textAlignment = .center
        
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
            $0.bottom.equalToSuperview().inset(51.scale() + UIView.safeAreaBottom)
            $0.height.equalTo(58.scale())
        }
    }
}

//MARK: - Set Action -
extension RecoveryPasswordAlert {
    private func setupAction() {
        mainButton.setActionButton { [weak self] in
            self?.dismiss(animated: true)
        }
    }
}
