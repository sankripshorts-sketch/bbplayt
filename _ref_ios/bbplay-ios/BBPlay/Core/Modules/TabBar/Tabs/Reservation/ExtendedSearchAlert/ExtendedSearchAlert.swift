import Foundation
import SnapKit

final class ExtendedSearchAlert: BaseBottomSheetController {
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()
    private let mainButton = MainButton()

    init() {
        super.init(with: 469.scale())
    }
    
    override func setupUI() {
        super.setupUI()
        setupMainButton()
        setupTitle()
        setupDescription()
    }
}

private extension ExtendedSearchAlert {
    func setupTitle() {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        paragraph.lineHeightMultiple = 0.78
        paragraph.minimumLineHeight = 28.scale()
        paragraph.maximumLineHeight = 28.scale()
        
        let text = NSAttributedString(
            string: Localizable.extendedSearchTitle(),
            attributes: [
                .paragraphStyle: paragraph,
                .font: Font.dinRoundProBold(size: 28.scale())!,
                .foregroundColor: UIColor.white,
            ])
        
        titleLabel.attributedText = text
        titleLabel.numberOfLines = 1
        contentView.addSubview(titleLabel)

        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().offset(41.scale())
            $0.centerX.equalToSuperview()
            $0.height.equalTo(28.scale())
        }
    }
    
    func setupDescription() {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .left
        paragraph.lineHeightMultiple = 0.78
        paragraph.minimumLineHeight = 20.scale()
        paragraph.maximumLineHeight = 20.scale()
        
        let text = NSAttributedString(
            string: Localizable.extendedSearchDesctiption(),
            attributes: [
                .paragraphStyle: paragraph,
                .font: Font.dinRoundProMedi(size: 20.scale())!,
                .foregroundColor: Color.commonText()!,
            ])
        
        descriptionLabel.attributedText = text
        descriptionLabel.numberOfLines = 0
        contentView.addSubview(descriptionLabel)
        
        descriptionLabel.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(16.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
        }
    }

    func setupMainButton() {
        mainButton.configure(title: Localizable.okey())
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
