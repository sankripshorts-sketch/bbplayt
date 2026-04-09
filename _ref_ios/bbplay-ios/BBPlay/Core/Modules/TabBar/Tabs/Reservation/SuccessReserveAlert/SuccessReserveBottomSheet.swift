import Foundation
import SnapKit

final class SuccessReserveBottomSheet: BaseBottomSheetController {

    private let logo = UIImageView()
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()
    private let mainButton = MainButton()
    
    init() {
        super.init(with: 469.scale())
    }
    
    override func setupUI() {
        super.setupUI()
        setupMainButton()
        setupLogo()
        setupTitle()
        setupDescription()
    }
}

private extension SuccessReserveBottomSheet {
    func setupLogo() {
        logo.image = Image.logo()
        contentView.addSubview(logo)
        
        logo.snp.makeConstraints {
            $0.top.equalToSuperview().inset(52.scale())
            $0.centerX.equalToSuperview()
            $0.height.equalTo(79.scale())
            $0.width.equalTo(203.scale())
        }
    }
    
    func setupTitle() {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        paragraph.lineHeightMultiple = 0.78
        paragraph.minimumLineHeight = 28.scale()
        paragraph.maximumLineHeight = 28.scale()
        
        let text = NSAttributedString(
            string: Localizable.successReserveAlertTitle(),
            attributes: [
                .paragraphStyle: paragraph,
                .font: Font.dinRoundProBold(size: 28.scale())!,
                .foregroundColor: UIColor.white,
            ])
        
        titleLabel.attributedText = text
        titleLabel.numberOfLines = 2
        contentView.addSubview(titleLabel)
        
        titleLabel.snp.makeConstraints {
            $0.top.equalTo(logo.snp.bottom).offset(32.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(56.scale())
        }
    }
    
    func setupDescription() {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        paragraph.lineHeightMultiple = 0.78
        paragraph.minimumLineHeight = 20.scale()
        paragraph.maximumLineHeight = 20.scale()
        
        let text = NSAttributedString(
            string: Localizable.successReserveAlertDescription(),
            attributes: [
                .paragraphStyle: paragraph,
                .font: Font.dinRoundProMedi(size: 20.scale())!,
                .foregroundColor: Color.commonText()!,
            ])
        
        descriptionLabel.attributedText = text
        descriptionLabel.numberOfLines = 3
        contentView.addSubview(descriptionLabel)
        
        descriptionLabel.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(24.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(mainButton.snp.top).offset(-32.scale())
        }
    }
    
    func setupMainButton() {
        mainButton.configure(title: Localizable.successReserveAlertGreatButton())
        mainButton.setActionButton { [weak self] in
            self?.dismiss(animated: true)
        }
        
        contentView.addSubview(mainButton)
        mainButton.snp.makeConstraints {
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom + 32.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(58.scale())
        }
    }
}
