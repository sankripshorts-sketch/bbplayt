import Foundation
import SnapKit

final class LocalEventViewImpl: UIView {
    
    private var pullToRefreshAction: EmptyClosure?
    
    private lazy var layout = makeLayout()
    private lazy var collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
    private let bottomView = LocalEventBottomView()
    private let pullToRefresh = UIRefreshControl()
    
    private var dataSource: LocalEventDataSourceAdapter?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        dataSource = LocalEventDataSourceAdapter(collectionView)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
}

// MARK: - Layout -
private extension LocalEventViewImpl {
    func makeLayout() -> UICollectionViewCompositionalLayout {
        let configuration = UICollectionViewCompositionalLayoutConfiguration()
        configuration.scrollDirection = .vertical
        configuration.interSectionSpacing = 32.scaleIfNeeded()
        
        let sectionProvider: UICollectionViewCompositionalLayoutSectionProvider = { [weak self] (sectionIndex, environment) -> NSCollectionLayoutSection? in
            
            guard let sectionType = CVSection(rawValue: sectionIndex) else { return nil }
            switch sectionType {
                case .winningPlace: return self?.makeWinningPlaceLayout()
                case .topPlayer: return self?.makeTopPlayersLayout()
            }
        }
        
        return UICollectionViewCompositionalLayout(sectionProvider: sectionProvider, configuration: configuration)
    }
    
    func makeWinningPlaceLayout() -> NSCollectionLayoutSection {
        let itemSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .absolute(42.scaleIfNeeded()))
        let item = NSCollectionLayoutItem(layoutSize: itemSize)
        
        let groupSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .estimated(.pi))
        let group = NSCollectionLayoutGroup.vertical(layoutSize: groupSize, subitems: [item])
        group.contentInsets = .init(top: .zero,
                                    leading: 24.scaleIfNeeded(),
                                    bottom: .zero,
                                    trailing: 24.scaleIfNeeded())
        
        let section = NSCollectionLayoutSection(group: group)
        section.interGroupSpacing = 4.scaleIfNeeded()
        section.contentInsets = .init(top: 18.scaleIfNeeded(),
                                      leading: .zero,
                                      bottom: .zero,
                                      trailing: .zero)
        
        let headerSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .estimated(.pi))
        let sectionHeader = NSCollectionLayoutBoundarySupplementaryItem(
            layoutSize: headerSize,
            elementKind: UICollectionView.elementKindSectionHeader, alignment: .top)
        section.boundarySupplementaryItems = [sectionHeader]
        return section
    }
    
    func makeTopPlayersLayout() -> NSCollectionLayoutSection {
        let itemSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .absolute(42.scaleIfNeeded()))
        let item = NSCollectionLayoutItem(layoutSize: itemSize)
        
        let groupSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .estimated(.pi))
        let group = NSCollectionLayoutGroup.vertical(layoutSize: groupSize, subitems: [item])
        
        let section = NSCollectionLayoutSection(group: group)
        section.interGroupSpacing = 4.scaleIfNeeded()
        section.contentInsets = .init(top: 8.scaleIfNeeded(),
                                      leading: 24.scaleIfNeeded(),
                                      bottom: 84.scaleIfNeeded(),
                                      trailing: 24.scaleIfNeeded())
        
        let headerSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .estimated(.pi))
        let sectionHeader = NSCollectionLayoutBoundarySupplementaryItem(
            layoutSize: headerSize,
            elementKind: UICollectionView.elementKindSectionHeader, alignment: .top)
        section.boundarySupplementaryItems = [sectionHeader]
        return section
    }
}

// MARK: - Private -
private extension LocalEventViewImpl {
    func setupUI() {
        backgroundColor = Color.background()
        setupCollectionView()
        setupBottomView()
        setupPullToRefresh()
    }
    
    func setupCollectionView() {
        collectionView.register(
            MainLocalEventHeader.self,
            forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader,
            withReuseIdentifier: MainLocalEventHeader.identifier)
        collectionView.register(
            LocalEventHeader.self,
            forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader,
            withReuseIdentifier: LocalEventHeader.identifier)
        collectionView.register(
            LocalEventPlaceCell.self,
            forCellWithReuseIdentifier: LocalEventPlaceCell.identifier)
        collectionView.register(
            LeaderboardCell.self,
            forCellWithReuseIdentifier: LeaderboardCell.identifier)
        
        collectionView.backgroundColor = .clear
        collectionView.showsVerticalScrollIndicator = false
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.contentInsetAdjustmentBehavior = .never
        
        addSubview(collectionView)
        collectionView.snp.makeConstraints {
            $0.top.left.right.equalToSuperview()
            $0.bottom.equalTo(safeAreaLayoutGuide.snp.bottom)
        }
    }
    
    func setupBottomView() {
        addSubview(bottomView)
        bottomView.snp.makeConstraints {
            $0.left.right.equalToSuperview()
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom)
        }
    }
    
    func setupPullToRefresh() {
        collectionView.addSubview(pullToRefresh)
        pullToRefresh.addTarget(self, action: #selector(pullToRefreshSwipe), for: .primaryActionTriggered)
    }
    
    @objc func pullToRefreshSwipe() {
        pullToRefreshAction?()
    }
}

// MARK: - Section -
extension LocalEventViewImpl {
     enum CVSection: Int, CaseIterable {
        case winningPlace = 0
        case topPlayer
    }
}

// MARK: - Public -
extension LocalEventViewImpl {
    func update(with event: LocalEvent<Section<Header, Item>>) {
        dataSource?.update(with: event)
    }
    
    func updateBottomView(with state: LocalEventBottomView.StateView,
                          description: String?,
                          title: String?) {
        bottomView.updateBottomView(with: state,
                                    description: description,
                                    title: title)
    }
    func setConnectEventAction(_ action: @escaping EmptyClosure) {
        bottomView.setConnectEventAction(action)
    }
    
    func setEventButtonAction(_ action: @escaping EmptyClosure) {
        bottomView.setEventButtonAction(action)
    }
    
    func updateBottomButton(isEnabled: Bool) {
        bottomView.updateBottomButton(isEnabled: isEnabled)
    }
    
    func setPullToRefreshAction(_ action: @escaping EmptyClosure) {
        pullToRefreshAction = action
    }
    
    func endRefreshing() {
        guard pullToRefresh.isRefreshing else { return }
        pullToRefresh.endRefreshing()
    }
}
