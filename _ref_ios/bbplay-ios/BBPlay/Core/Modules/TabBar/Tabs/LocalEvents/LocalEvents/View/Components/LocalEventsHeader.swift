import Foundation
import SnapKit

final class LocalEventsHeader: UICollectionReusableView {
    
    private let title = UILabel()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    private func setupUI() {
        setupTitle()
    }
    
    private func setupTitle() {
        addSubview(title)
        title.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
}

// MARK: - Public -
extension LocalEventsHeader {
    func update(with info: LocalEventsDataSourceAdapter.EventHeaderInfo) {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        
        let text = NSAttributedString(string: info.title, attributes: [
            .paragraphStyle: paragraphStyle,
            .foregroundColor: info.textColor,
            .font: Font.dinRoundProBold(size: 28.scaleIfNeeded())!
        ])
        
        title.attributedText = text
    }
}
