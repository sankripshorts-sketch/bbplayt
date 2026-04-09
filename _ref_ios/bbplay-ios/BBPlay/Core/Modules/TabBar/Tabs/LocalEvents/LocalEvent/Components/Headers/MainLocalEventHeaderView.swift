import Foundation
import SnapKit

final class MainLocalEventHeader: UICollectionReusableView {
    private let imageView = UIImageView()
    private let labelContainer = UIView()
    private let titleLabel = UILabel()
    private let dateLabel = UILabel()
    private let descriptionLabel = UILabel()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
}

// MARK: - Private -
extension MainLocalEventHeader {
    func setupUI() {
        setupImageView()
        setupLabelContainer()
        setupTitleLabel()
        setupDateLabel()
        setupDescriptionLabel()
    }
    
    func setupImageView() {
        addSubview(imageView)
        imageView.snp.makeConstraints {
            $0.top.left.right.equalToSuperview()
            $0.height.equalTo(185.scaleIfNeeded())
        }
    }
    
    func setupLabelContainer() {
        addSubview(labelContainer)
        labelContainer.snp.makeConstraints {
            $0.top.equalTo(104.scaleIfNeeded())
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
            $0.bottom.equalToSuperview()
        }
    }
    
    func setupTitleLabel() {
        titleLabel.numberOfLines = 2
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.3
        titleLabel.font = Font.dinRoundProBold(size: 28.scaleIfNeeded())
        
        labelContainer.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.left.right.equalToSuperview()
            $0.height.greaterThanOrEqualTo(28.scaleIfNeeded())
        }
    }
    
    func setupDateLabel() {
        dateLabel.font = Font.dinRoundProBold(size: 18.scaleIfNeeded())
        
        labelContainer.addSubview(dateLabel)
        dateLabel.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(12.scaleIfNeeded())
            $0.left.right.equalToSuperview()
            $0.height.equalTo(16.scaleIfNeeded())
        }
    }
    
    func setupDescriptionLabel() {
        descriptionLabel.font = Font.dinRoundProMedi(size: 16.scaleIfNeeded())
        descriptionLabel.textColor = Color.localEventHeaderDescription()
        descriptionLabel.numberOfLines = 0
        
        labelContainer.addSubview(descriptionLabel)
        descriptionLabel.snp.makeConstraints {
            $0.top.equalTo(dateLabel.snp.bottom).offset(16.scaleIfNeeded())
            $0.left.right.bottom.equalToSuperview()
        }
    }
    
    func updateDateLabel(with text: String,
                         color: UIColor) {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineHeightMultiple = 0.78
    
        let text = NSAttributedString(string: text,
                                      attributes: [.paragraphStyle: paragraph,
                                                   .foregroundColor: color])
        dateLabel.attributedText = text
    }
}

// MARK: - Public -
extension MainLocalEventHeader {
    func update(with header: Header) {
        titleLabel.text = header.title
        imageView.image = header.image
        updateDateLabel(with: header.date.date,
                        color: header.date.textColor)
        descriptionLabel.text = header.description
    }
}

