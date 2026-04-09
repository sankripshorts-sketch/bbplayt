import Foundation
import SnapKit

class ClubsBottomSheetCell: BaseCollectionCell {
    
    let titleLabel = UILabel()
    let adressLabel = UILabel()
    private let checkBox = UIImageView()

    override func setupUI() {
        backgroundColor = Color.clubCellBackground()
        layer.cornerRadius = 8
        
        setupCheckBox()
        setupTitleLabel()
        setupAdressLabel()
    }

    private func setupCheckBox() {
        contentView.addSubview(checkBox)
        checkBox.snp.makeConstraints {
            $0.right.centerY.equalToSuperview().inset(13.scaleIfNeeded())
            $0.size.equalTo(32.scaleIfNeeded())
        }
    }

    func setupTitleLabel() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.63
        titleLabel.attributedText = NSMutableAttributedString(
            string: Localizable.nameClub(),
            attributes: [
                .paragraphStyle: paragraphStyle,
                .foregroundColor: UIColor.white,
                .font: Font.dinRoundProBold(size: 18.scale())!
            ])

        contentView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.left.equalToSuperview().inset(12.scaleIfNeeded())
            $0.top.equalToSuperview().inset(10.scaleIfNeeded())
            $0.height.equalTo(24.scaleIfNeeded())
        }
    }

    func setupAdressLabel() {
        contentView.addSubview(adressLabel)
        adressLabel.snp.makeConstraints {
            $0.left.equalTo(titleLabel.snp.left)
            $0.top.equalTo(titleLabel.snp.bottom)
        }
    }

    private func setSelected() {
        checkBox.image = Image.check()!.withRenderingMode(.alwaysOriginal)
    }

    private func setUnselected() {
        checkBox.image = Image.uncheck()!.withRenderingMode(.alwaysOriginal)
    }
    
    func update(with selected: Bool, adress: String? = nil) {
        selected ? setSelected() : setUnselected()
        updateAdress(with: adress)
    }
    
    func checkBoxHide() {
        checkBox.isHidden = true
    }
}

private extension ClubsBottomSheetCell {
    func updateAdress(with adress: String?) {
        guard let adress = adress else { return }

        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        adressLabel.attributedText = NSMutableAttributedString(
            string: adress,
            attributes: [
                .paragraphStyle: paragraphStyle,
                .foregroundColor: Color.commonText()!,
                .font: Font.dinRoundProMedi(size: 14.scale())!
            ])
    }
}
