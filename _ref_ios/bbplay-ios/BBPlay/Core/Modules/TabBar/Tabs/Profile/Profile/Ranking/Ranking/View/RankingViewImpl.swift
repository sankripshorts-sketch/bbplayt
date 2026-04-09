import Foundation
import SnapKit

final class RankingViewImpl: UIView {
        
    private let logo = UIImageView()
    
    private let botMask = UIView()
    private let botLayer = CAGradientLayer()

    private let delegateAdapter = RankingDelegateAdapter()
    private lazy var collectionViewLayout: UICollectionViewCompositionalLayout = {
        let itemSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0), heightDimension: .fractionalHeight(1.0))
        let item = NSCollectionLayoutItem(layoutSize: itemSize)

        let groupSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0), heightDimension: Appearance.isIpad ? .fractionalHeight(1/3.8) : .estimated(121))
        let group = NSCollectionLayoutGroup.vertical(layoutSize: groupSize, subitem: item, count: 1)

        group.edgeSpacing = NSCollectionLayoutEdgeSpacing(leading: .fixed(0),
                                                          top: .fixed(0),
                                                          trailing: .fixed(0),
                                                          bottom: .fixed(8))

        let section = NSCollectionLayoutSection(group: group)
        section.contentInsets = .init(top: 12.scale(),
                                      leading: 24.scale(),
                                      bottom: 12.scale(),
                                      trailing: 24.scale())
    
        let layout = UICollectionViewCompositionalLayout(section: section)
        layout.configuration.scrollDirection = .vertical
        return layout
    }()
    
    private lazy var collectionView = UICollectionView(
        frame: .zero,
        collectionViewLayout: collectionViewLayout)
    private var dataSourceAdapter: RankingDataSourceAdapter?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        dataSourceAdapter = RankingDataSourceAdapter(collectionView)
        collectionView.delegate = delegateAdapter
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    private func setupUI() {
        backgroundColor = Color.background()
        setupLogo()
        setupCollectionView()
        setupBotMask()
    }
    
    private func setupLogo() {
        logo.image = Image.logo()
        
        addSubview(logo)
        
        logo.snp.makeConstraints {
            $0.centerX.equalToSuperview()
            $0.top.equalToSuperview().inset(68.scale())
            $0.height.equalTo(49.scale())
            $0.width.equalTo(125.scale())
        }
    }
    
    private func setupCollectionView() {
        collectionView.backgroundColor = Color.background()
        collectionView.showsVerticalScrollIndicator = false
        
        addSubview(collectionView)
        
        collectionView.snp.makeConstraints {
            $0.top.equalTo(logo.snp.bottom).offset(10.scale())
            $0.left.right.equalToSuperview()
            $0.bottom.equalTo(safeAreaLayoutGuide.snp.bottom)
        }
        
        collectionView.register(GameCell.self, forCellWithReuseIdentifier: GameCell.identifier)
    }
    
    private func setupBotMask() {
        botLayer.colors = [Color.gradientRanking()!
            .withAlphaComponent(0)
            .cgColor,
                           Color.gradientRanking()!
            .withAlphaComponent(1)
            .cgColor]
        botLayer.frame = CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 45.scale())
        
        botMask.isUserInteractionEnabled = false
        botMask.layer.addSublayer(botLayer)
        addSubview(botMask)
        
        botMask.snp.makeConstraints {
            $0.left.right.equalToSuperview()
            $0.height.equalTo(45.scale())
            $0.bottom.equalTo(safeAreaLayoutGuide.snp.bottom)
        }
    }
}

// MARK: - Public -
extension RankingViewImpl {
    func setCellTapAction(_ action: @escaping ((GameType) -> Void)) {
        delegateAdapter.setAction(action)
    }

    func update(with games: [Game]) {
        dataSourceAdapter?.update(with: games)
    }
}
