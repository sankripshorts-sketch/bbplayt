import Foundation
import SnapKit

final class NewClubsBottomSheetCell: ClubsBottomSheetCell {
    
    private let comingSoon = ComingSoonView()
    
    override func setupUI() {
        super.setupUI()
        setupComingSoon()
        checkBoxHide()
        isSelected = false
    }

    override func setupTitleLabel() {        
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 1
        titleLabel.attributedText = NSMutableAttributedString(
            string: Localizable.newClube(),
            attributes: [
                .paragraphStyle: paragraphStyle,
                .foregroundColor: Color.commonText()!,
                .font: Font.dinRoundProBold(size: 18.scale())!
            ])
        
        contentView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.left.equalToSuperview().inset(12.scale())
            $0.centerY.equalToSuperview()
        }
    }
    
    override func setupAdressLabel() {
        super.setupAdressLabel()
        adressLabel.isHidden = true
    }
    
    
    private func setupComingSoon() {
        contentView.addSubview(comingSoon)
        comingSoon.snp.makeConstraints {
            $0.right.equalToSuperview().offset(8.scaleIfNeeded())
            $0.centerY.equalToSuperview()
            $0.height.equalTo(29.scaleIfNeeded())
        }
    }
}
