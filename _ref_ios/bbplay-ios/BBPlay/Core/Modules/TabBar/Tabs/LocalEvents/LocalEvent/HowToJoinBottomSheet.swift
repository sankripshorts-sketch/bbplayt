import Foundation
import SnapKit

final class HowToJoinBottomSheet: BaseBottomSheetController {
    
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let descriptionLabel = UILabel()
    private let okeyButton = MainButton()
    
    init() {
        super.init(with: 697.scale())
        setAction()
    }
    
    override func setupUI() {
        super.setupUI()
        setupOkeyButton()
        setupTitleLabel()
        setupSubtitleLabel()
        setupDescriptionLabel()
    }
}

// MARK: - Private -
private extension HowToJoinBottomSheet {
    func setAction() {
        okeyButton.setActionButton { [unowned self] in
            dismiss(animated: true)
        }
    }
    
    func setupOkeyButton() {
        okeyButton.configure(title: Localizable.okey())
        
        contentView.addSubview(okeyButton)
        okeyButton.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom + 43.scaleIfNeeded())
            $0.height.equalTo(58.scaleIfNeeded())
        }
    }

    func setupTitleLabel() {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineHeightMultiple = 0.78
        paragraph.minimumLineHeight = 28
        paragraph.maximumLineHeight = 28.scaleIfNeeded()
        paragraph.alignment = .center
        
        let text = NSAttributedString(
            string: Localizable.howToJoin(),
            attributes: [
                .paragraphStyle: paragraph,
                .font: Font.dinRoundProBold(size: 28.scaleIfNeeded())!,
                .foregroundColor: UIColor.white,
            ])

        titleLabel.numberOfLines = 2
        titleLabel.attributedText = text

        contentView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(41.scaleIfNeeded())
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
        }
    }
    
    func setupSubtitleLabel() {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineHeightMultiple = 1.01
        paragraph.minimumLineHeight = 26
        paragraph.maximumLineHeight = 26.scaleIfNeeded()
        paragraph.firstLineHeadIndent = 0
        paragraph.headIndent = 21.scaleIfNeeded()

        let text = NSAttributedString(
            string: Localizable.pointsDescription(),
            attributes: [
                .paragraphStyle: paragraph,
                .font: Font.dinRoundProMedi(size: 20.scaleIfNeeded())!,
                .foregroundColor: Color.commonText()!,
            ])

        subtitleLabel.numberOfLines = 0
        subtitleLabel.attributedText = text
        
        contentView.addSubview(subtitleLabel)
        subtitleLabel.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(10.scaleIfNeeded())
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
        }
    }
    
    func setupDescriptionLabel() {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineHeightMultiple = 0.86
        paragraph.minimumLineHeight = 20
        paragraph.maximumLineHeight = 20.scaleIfNeeded()
        paragraph.alignment = .center
        
        let text = NSAttributedString(
            string: Localizable.detailedInfoHowToJoin(),
            attributes: [
                .paragraphStyle: paragraph,
                .font: Font.dinRoundProMedi(size: 18.scaleIfNeeded())!,
                .foregroundColor: UIColor.white,
            ])
        
        descriptionLabel.attributedText = text
        descriptionLabel.numberOfLines = 2
        
        contentView.addSubview(descriptionLabel)
        descriptionLabel.snp.makeConstraints {
            $0.top.equalTo(subtitleLabel.snp.bottom).offset(24.scaleIfNeeded())
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
            $0.height.equalTo(40.scaleIfNeeded())
            $0.bottom.equalTo(okeyButton.snp.top).offset(-24.scaleIfNeeded())
        }
    }
}
