import Foundation
import SnapKit

class PickerItemCell: BaseCollectionCell {
    
    let title = UILabel()
    
    override func setupUI() {
        super.setupUI()
        setupTitle()
    }

    func setupTitle() {
        title.textColor = Color.pickerViewTextVeryDark()
        title.textAlignment = .center
        title.font = Font.dinRoundProBold(size: 28.scale())
        
        contentView.addSubview(title)
        title.snp.makeConstraints {
            $0.centerY.centerX.equalToSuperview()
            $0.edges.equalToSuperview()
        }
    }
    
    func updateTextColor(with textColor: UIColor) {
        title.textColor = textColor
    }
}

extension PickerItemCell {
    func update(with model: SortLeaderboard) {
        title.text = model.title
    }
}
