import Foundation
import SnapKit

final class LocalEventWithoutEventsCell: BaseCollectionCell {
    
    private let titleLabel = UILabel()
    
    override func setupUI() {
        contentView.backgroundColor = Color.noActiveEventColor()
        contentView.layer.cornerRadius = 8
        setupTitleLabel()
    }
}

// MARK: - Private -
private extension LocalEventWithoutEventsCell {
    func setupTitleLabel() {
        titleLabel.font  = Font.dinRoundProBold(size: 20.scaleIfNeeded())
        titleLabel.numberOfLines = 2
        titleLabel.textAlignment = .center
        titleLabel.textColor = Color.commonText()
        titleLabel.text = Localizable.noActiveEvents()
        
        contentView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.center.equalToSuperview()
        }
    }
}
