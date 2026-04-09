import Foundation
import SnapKit

final class ReplenishCell: BaseCollectionCell {
    
    private let amountLabel = UILabel()
    
    override func setupUI() {
        backgroundColor = Color.notPrizePlace()
        layer.cornerRadius = 8
        setupAmountLabel()
    }
    
    private func setupAmountLabel() {
        amountLabel.textColor = .white
        amountLabel.font = Font.dinRoundProBold(size: 20.scale())
        amountLabel.textAlignment = .center
        
        contentView.addSubview(amountLabel)
        amountLabel.snp.makeConstraints {
            $0.top.bottom.equalToSuperview().inset(8.scale())
            $0.left.right.equalToSuperview()
        }
    }

    func updateCell(with amountValue: Int) {
        amountLabel.text = Localizable.rub(String(amountValue))
    }
}
