import Foundation
import SnapKit

enum NewsButtonType {
    case comment
    case photo
    case link
    case poll
}

final class NewsPostButton: UIView {
    
    private let container = UIStackView()
    private let buttonView = UIImageView()
    private let countLabel = UILabel()
    
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
        backgroundColor = Color.newsButtonBackground()
        layer.cornerRadius = 4
        
        setupContainer()
        setupButtonView()
        setupCountLabel()
    }

    private func setupContainer() {
        container.spacing = 6.scaleIfNeeded()
        container.alignment = .fill
        container.distribution = .fillProportionally
        
        addSubview(container)
        container.snp.makeConstraints {
            $0.center.equalToSuperview()
            $0.height.equalTo(16.scaleIfNeeded())
        }
    }

    private func setupButtonView() {
        container.addArrangedSubview(buttonView)
        buttonView.snp.makeConstraints {
            $0.size.equalTo(16.scaleIfNeeded())
        }
    }

    private func setupCountLabel() {
        countLabel.font = Font.dinRoundProBold(size: 14.scaleIfNeeded())
        countLabel.textColor = Color.newsButtonText()
        
        
        container.addArrangedSubview(countLabel)
        buttonView.snp.makeConstraints {
            $0.height.equalTo(16.scaleIfNeeded())
        }
    }
}

extension NewsPostButton {
    func update(with type: NewsButtonType,
                and count: Int? = nil) {
        
        switch type {
            case .comment:
                buttonView.image = Image.newsCommentIcon()
                guard let count = count else { return }
                countLabel.text = String(describing: count)
            case .photo:
                buttonView.image = Image.newsPhotoIcon()
                guard let count = count else { return }
                countLabel.text = String(describing: count)
            case .link:
                buttonView.image = Image.newsLinkArrowIcon()
            case .poll:
                buttonView.image = Image.newsPollIcon()
        }
    }
}
