import Foundation
import SnapKit

final class WrongCodeAlert: BaseBottomSheetController {
    
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()
    private let mainButton = MainButton()
    
    init() {
        super.init(with: 331.scale())
        setupAction()
    }
    
    override func setupUI() {
        super.setupUI()
        
        setupTitle()
        setupDescription()
        setupButton()
    }
}
// MARK: - Private extension -

private extension WrongCodeAlert {

    func setupTitle() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 28.scale()
        paragraphStyle.maximumLineHeight = 28.scale()
        
        titleLabel.attributedText = NSAttributedString(
            string: Localizable.wrongCodeAlertTitle(),
            attributes: [
                .font: Font.dinRoundProBold(size: 28.scale())!,
                .foregroundColor: Color.incorrectText()!,
                .paragraphStyle: paragraphStyle
            ])
        titleLabel.numberOfLines = 0
        titleLabel.textAlignment = .center
        
        contentView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(53.scale())
            $0.centerX.equalToSuperview()
        }
    }

    func setupDescription() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 20.scale()
        paragraphStyle.maximumLineHeight = 20.scale()
        
        descriptionLabel.attributedText = NSAttributedString(
            string: Localizable.wrongCodeAlertDescription(),
            attributes: [
                .font: Font.dinRoundProMedi(size: 20.scale())!,
                .foregroundColor: Color.newsButtonText()!,
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
    
    func setupButton() {
        mainButton.setEnable(isEnabled: true)
        mainButton.configure(title: Localizable.wrongCodeAlertButton())
        
        contentView.addSubview(mainButton)
        mainButton.snp.makeConstraints {
            $0.top.equalTo(descriptionLabel.snp.bottom).offset(24.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalToSuperview().inset(51.scale() + UIView.safeAreaBottom)
            $0.height.equalTo(58.scale())
        }
    }
}

// MARK: - Setup Action -
private extension WrongCodeAlert {
    func setupAction() {
        mainButton.setActionButton { [weak self] in
            self?.dismiss(animated: true)
        }
    }
}
