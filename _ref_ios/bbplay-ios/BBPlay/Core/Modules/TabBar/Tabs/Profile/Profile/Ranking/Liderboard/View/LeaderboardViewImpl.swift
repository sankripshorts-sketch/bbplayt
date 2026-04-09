import Foundation
import UIKit

final class LeaderboardViewImpl: UIView {

    private let headerImage = UIImageView()
    private let headerLabel = UILabel()
    private let headerCollection = UIView()
    private let hashtagLabel = UILabel()
    private let nicknameLabel = UILabel()
    private let sortButton = UIButton()
    private let sortTypeLabel = UILabel()

    private var action: EmptyClosure?

    private let collectionViewLayout = UICollectionViewFlowLayout()
    private lazy var collectionView = UICollectionView(
        frame: .zero,
        collectionViewLayout: collectionViewLayout)
    private lazy var dataSourceAdapter = LeaderboardDataSourceAdapter(collectionView)

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
        backgroundColor = Color.background()
        setupHeaderImage()
        setupHeaderLabel()
        setupHeaderCollection()
        setupHashtagLabel()
        setupNicknameLabel()
        setupSortButton()
        setupVictoriesLabel()
        
        setupCollectionView()
        setupLeaderboardLayout()
    }
    
    private func setupHeaderImage() {
        addSubview(headerImage)
        
        headerImage.snp.makeConstraints {
            $0.top.left.right.equalToSuperview()
            $0.height.equalTo(185)
        }
    }
    
    private func setupHeaderLabel() {
        headerLabel.font = Font.dinRoundProBold(size: 28.scale())
        headerLabel.textColor = .white
        headerImage.addSubview(headerLabel)
        
        headerLabel.snp.makeConstraints {
            $0.bottom.equalToSuperview().inset(53.scale())
            $0.left.equalToSuperview().inset(24.scale())
            $0.height.equalTo(28.scale())
        }
    }
    
    private func setupHeaderCollection() {
        addSubview(headerCollection)
        
        headerCollection.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
            $0.top.equalTo(headerImage.snp.bottom).offset(-13.scale())
            $0.height.equalTo(20.scale())
        }
    }
    
    private func setupHashtagLabel() {
        hashtagLabel.text = Localizable.hashtag()
        hashtagLabel.font = Font.dinRoundProBold(size: 14.scale())
        hashtagLabel.textColor = .white
        headerCollection.addSubview(hashtagLabel)
        
        hashtagLabel.snp.makeConstraints {
            $0.left.equalToSuperview().inset(13.scaleIfNeeded())
            $0.top.bottom.equalToSuperview()
            $0.width.equalTo(11.scaleIfNeeded())
        }
    }
    
    private func setupNicknameLabel() {
        nicknameLabel.text = Localizable.nickname().uppercased()
        nicknameLabel.font = Font.dinRoundProBold(size: 14.scale())
        nicknameLabel.textColor = .white
        headerCollection.addSubview(nicknameLabel)
        
        nicknameLabel.snp.makeConstraints {
            $0.top.bottom.equalToSuperview()
            $0.left.equalTo(hashtagLabel.snp.right)
                .offset(18.scaleIfNeeded())
        }
    }
    
    private func setupSortButton() {
        sortButton.setImage(Image.settings()!.withTintColor(.white), for: .normal)
        sortButton.addTarget(self,
                             action: #selector(actionSortButton),
                             for: .touchUpInside)
        headerCollection.addSubview(sortButton)
        
        sortButton.snp.makeConstraints {
            $0.top.bottom.equalToSuperview().inset(2.scale())
            $0.right.equalToSuperview().inset(4.scaleIfNeeded())
            $0.size.equalTo(16.scale())
        }
    }
    
    private func setupVictoriesLabel() {
        sortTypeLabel.text = Localizable.victories().uppercased()
        sortTypeLabel.font = Font.dinRoundProBold(size: 14.scale())
        sortTypeLabel.textColor = .white
        sortTypeLabel.lineBreakMode = .byClipping
        sortTypeLabel.adjustsFontSizeToFitWidth = true
        headerCollection.addSubview(sortTypeLabel)
        
        sortTypeLabel.snp.makeConstraints {
            $0.top.bottom.equalToSuperview()
            $0.right.equalTo(sortButton.snp.left).offset(-5.scaleIfNeeded())
            $0.width.equalTo(93.scaleIfNeeded())
        }
    }
    
    private func setupCollectionView() {
        collectionView.backgroundColor = Color.background()
        collectionView.showsVerticalScrollIndicator = false
        addSubview(collectionView)
        
        collectionView.snp.makeConstraints {
            $0.top.equalTo(headerCollection.snp.bottom).offset(8.scale())
            $0.left.right.equalToSuperview().inset(24)
            $0.bottom.equalToSuperview().inset(31.scale() + UIView.safeAreaBottom)
        }
        
        collectionView.register(LeaderboardCell.self, forCellWithReuseIdentifier: LeaderboardCell.identifier)
    }
    
    private func setupLeaderboardLayout() {
        collectionViewLayout.minimumLineSpacing = 4.scale()
        collectionViewLayout.itemSize = CGSize(
            width: 327.scaleIfNeeded(),
            height: 42.scaleIfNeeded())
        collectionViewLayout.scrollDirection = .vertical
    }

    @objc private func actionSortButton() {
        action?()
    }
    
    private func getTitle(with sortType: SortType) -> String {
        switch sortType {
            case .assistants: return Localizable.assistants()
            case .defeats: return Localizable.defeats()
            case .victories: return Localizable.victories()
            case .KDR: return Localizable.kdR()
            case .kills: return Localizable.kills()
            case .deaths: return Localizable.deaths()
            case .points: return Localizable.points()
            case .winRatio: return Localizable.winRatio()
            case .none:
                logger.error("\(self), \(sortType)")
                assertionFailure()
                return String()
        }
    }
}

// MARK: - Public
extension LeaderboardViewImpl {
    func update(with game: Game, sortType: SortType) {
        headerImage.image = game.gameType.imageForHeader
        headerLabel.text = game.gameTitle
        sortTypeLabel.text = getTitle(with: sortType)
        dataSourceAdapter.update(with: game.ranks, sortType: sortType)
    }

    func setAction(action: @escaping EmptyClosure) {
        self.action = action
    }
}
