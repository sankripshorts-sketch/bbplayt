import Foundation
import SnapKit

final class LocalEventCell: BaseCollectionCell {
    
    private(set) var eventId: String?
    
    private let borderLayer = CAGradientLayer()
    private let labelContainer = UIView()
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let imageView = UIImageView()
    private let playerView = PlayerView()
    
    override var bounds: CGRect {
        willSet {
            guard !bounds.isEmpty else { return }
            borderLayer.frame = bounds
        }
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        imageView.alpha = 1
        playerView.alpha = 1
        playerView.removeFromSuperview()
        contentView.backgroundColor = .clear
    }
    
    override func setupUI() {
        contentView.layer.cornerRadius = 8
        setupImageView()
        setupBorderLayer()
        setupLabelContainer()
        setupSubtitleLabel()
        setupTitleLabel()
    }
    
    private func setupImageView() {
        contentView.addSubview(imageView)
        imageView.snp.makeConstraints { $0.edges.equalToSuperview() }
    }
    
    private func setupLabelContainer() {
        contentView.addSubview(labelContainer)
        labelContainer.snp.makeConstraints {
            $0.top.greaterThanOrEqualToSuperview()
            $0.left.bottom.right.equalToSuperview().inset(16.scaleIfNeeded())
        }
    }
    
    private func setupSubtitleLabel() {
        subtitleLabel.font = Font.dinRoundProBold(size: 12.scaleIfNeeded())
        labelContainer.addSubview(subtitleLabel)
        subtitleLabel.snp.makeConstraints {
            $0.bottom.left.right.equalToSuperview()
            $0.height.equalTo(16.scaleIfNeeded())
        }
    }

    private func setupTitleLabel() {
        titleLabel.numberOfLines = 0
        titleLabel.font = Font.dinRoundProBold(size: 20.scaleIfNeeded())
        
        labelContainer.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.left.right.equalToSuperview()
            $0.bottom.equalTo(subtitleLabel.snp.top)
        }
    }
    
    private func setupPlayerView() {
        contentView.addSubview(playerView)
        playerView.snp.makeConstraints {
            $0.top.equalToSuperview().inset(14.scaleIfNeeded())
            $0.right.equalToSuperview().offset(8.scaleIfNeeded())
            $0.height.equalTo(29.scaleIfNeeded())
        }
    }
    
    private func setupBorderLayer() {
        borderLayer.colors = [
            UIColor.white.withAlphaComponent(0).cgColor,
            UIColor.white.withAlphaComponent(0.16).cgColor
        ]
        
        let shape = CAShapeLayer()
        shape.lineWidth = 2.scaleIfNeeded()
        shape.path = UIBezierPath(roundedRect: self.bounds, cornerRadius: 8).cgPath
        shape.strokeColor = UIColor.white.cgColor
        shape.fillColor = UIColor.clear.cgColor
        
        borderLayer.mask = shape
        contentView.layer.addSublayer(borderLayer)
    }
}

// MARK: - Private -
private extension LocalEventCell {
    func setupColors(with sectionType: LocalEventsViewImpl.Section) {
        switch sectionType {
            case .reward:
                titleLabel.textColor = .white
                subtitleLabel.textColor = Color.finishedTimeColor()
            case .active:
                titleLabel.textColor = .white
                subtitleLabel.textColor = Color.activeTimeColor()
            case .completed:
                titleLabel.textColor = Color.finishedTitleColor()
                subtitleLabel.textColor = Color.finishedTimeColor()
                imageView.alpha = 0.4
                playerView.alpha = 0.7
            case .noVisible:
                break
        }
    }
}

// MARK: - Public -
extension LocalEventCell {
    func update(with event: Event) {
        eventId = event.eventId
        titleLabel.text = event.eventTitle
        subtitleLabel.text = event.eventTimeInterval
        imageView.image = event.gameType.image
        setupColors(with: event.sectionType)
        if event.currentPlayerInEvent != nil { setupPlayerView() }
        if event.gameType == .all { contentView.backgroundColor = Color.allEventColor() }
    }
}
