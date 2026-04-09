import Foundation
import SnapKit

final class LocalEventHeader: UICollectionReusableView {
    
    private let titleLabel = UILabel()
    private let container = UIView()
    private let hashtagLabel = UILabel()
    private let nicknameLabel = UILabel()
    private let scoreLabel = UILabel()
    
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
private extension LocalEventHeader {
    func setupUI() {
        setupTitleLabel()
        setupContainer()
        setupHashtag()
        setupNicknameLabel()
        setupScoreLabel()
    }
    
    func setupTitleLabel() {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineHeightMultiple = 0.78
        
        let text = NSAttributedString(string: Localizable.topPlayers(), attributes: [
            .paragraphStyle: paragraph,
            .foregroundColor: UIColor.white,
            .font: Font.dinRoundProBold(size: 28.scaleIfNeeded())!
        ])
        
        titleLabel.attributedText = text
        
        addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.left.right.equalToSuperview()
            $0.height.equalTo(28.scaleIfNeeded())
        }
    }
    
    func setupContainer() {
        addSubview(container)
        container.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(16.scaleIfNeeded())
            $0.left.right.bottom.equalToSuperview()
        }
    }
    
    func setupHashtag() {
        hashtagLabel.textAlignment = .center
        hashtagLabel.text = Localizable.hashtag()
        hashtagLabel.font = Font.dinRoundProBold(size: 14.scaleIfNeeded())

        container.addSubview(hashtagLabel)
        hashtagLabel.snp.makeConstraints {
            $0.left.top.bottom.equalToSuperview()
            $0.width.equalTo(38.scaleIfNeeded())
        }
    }
    
    func setupNicknameLabel() {
        nicknameLabel.text = Localizable.nickname().uppercased()
        nicknameLabel.font = Font.dinRoundProBold(size: 14.scale())
        nicknameLabel.textColor = .white
        
        container.addSubview(nicknameLabel)
        nicknameLabel.snp.makeConstraints {
            $0.top.bottom.equalToSuperview()
            $0.left.equalTo(hashtagLabel.snp.right).offset(4.scaleIfNeeded())
            $0.width.equalTo(164.scaleIfNeeded())
        }
    }
    
    func setupScoreLabel() {
        scoreLabel.text = Localizable.points().uppercased()
        scoreLabel.font = Font.dinRoundProBold(size: 14.scale())
        scoreLabel.textColor = .white
        container.addSubview(scoreLabel)
        
        scoreLabel.snp.makeConstraints {
            $0.right.top.bottom.equalToSuperview()
            $0.width.equalTo(117.scaleIfNeeded())
            $0.left.equalTo(nicknameLabel.snp.right).offset(4.scaleIfNeeded())
        }
    }
}
