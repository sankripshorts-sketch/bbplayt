import Foundation
import SnapKit

final class LocalEventsViewImpl: UIView {
    
    private var pullToRefreshAction: EmptyClosure?
    
    private lazy var layout = makeLayout()
    private lazy var collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
    
    private var dataSource: LocalEventsDataSourceAdapter?
    private let delegateAdapter = LocalEventsDelegateAdapter()
    
    private let pullToRefresh = UIRefreshControl()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        
        dataSource = LocalEventsDataSourceAdapter(collectionView)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    private func makeLayout() -> UICollectionViewCompositionalLayout {
        let configuration = UICollectionViewCompositionalLayoutConfiguration()
        configuration.scrollDirection = .vertical
        configuration.interSectionSpacing = 24.scaleIfNeeded()
    
        let sectionProvider: UICollectionViewCompositionalLayoutSectionProvider = { (sectionIndex, environment) -> NSCollectionLayoutSection? in
            
            let itemSize = NSCollectionLayoutSize(
                widthDimension: .fractionalWidth(1.0),
                heightDimension: .absolute(121.scaleIfNeeded()))
            let item = NSCollectionLayoutItem(layoutSize: itemSize)
            
            let groupSize = NSCollectionLayoutSize(
                widthDimension: .fractionalWidth(1.0),
                heightDimension: .estimated(.pi))
            let group = NSCollectionLayoutGroup.vertical(layoutSize: groupSize, subitems: [item])
            
            let section = NSCollectionLayoutSection(group: group)
            section.interGroupSpacing = 16.scaleIfNeeded()
            
            let headerFooterSize = NSCollectionLayoutSize(
                widthDimension: .fractionalWidth(1.0),
                heightDimension: .estimated(.pi))
            let sectionHeader = NSCollectionLayoutBoundarySupplementaryItem(
                layoutSize: headerFooterSize,
                elementKind: UICollectionView.elementKindSectionHeader, alignment: .top)
            section.boundarySupplementaryItems = [sectionHeader]

            section.contentInsets = .init(top: 16.scaleIfNeeded(),
                                          leading: 24.scaleIfNeeded(),
                                          bottom: .zero,
                                          trailing: 24.scaleIfNeeded())
            return section
        }
        
        return UICollectionViewCompositionalLayout(sectionProvider: sectionProvider, configuration: configuration)
    }
    
    private func setupUI() {
        backgroundColor = Color.background()
        setupCollectionView()
        setupPullToRefresh()
    }

    private func setupCollectionView() {
        collectionView.delegate = delegateAdapter
        collectionView.register(LocalEventsHeader.self,
                                forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader,
                                withReuseIdentifier: LocalEventsHeader.identifier)
        collectionView.register(LocalEventCell.self,
                                forCellWithReuseIdentifier: LocalEventCell.identifier)
        collectionView.register(LocalEventWithoutEventsCell.self,
                                forCellWithReuseIdentifier: LocalEventWithoutEventsCell.identifier)
        collectionView.showsVerticalScrollIndicator = false
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.backgroundColor = .clear

        addSubview(collectionView)
        collectionView.snp.makeConstraints {
            $0.top.equalToSuperview().inset(60.scale())
            $0.left.right.equalToSuperview()
            $0.bottom.equalTo(safeAreaLayoutGuide.snp.bottom).inset(24.scale())
        }
    }
    
    private func setupPullToRefresh() {
        collectionView.addSubview(pullToRefresh)
        pullToRefresh.addTarget(self, action: #selector(pullToRefreshSwipe), for: .primaryActionTriggered)
    }
    
    @objc private func pullToRefreshSwipe() {
        pullToRefreshAction?()
    }
}

// MARK: - Section -
extension LocalEventsViewImpl {
    enum Section: Int, CaseIterable {
        case reward
        case active
        case completed
        case noVisible
    }
}

// MARK: - Public -
extension LocalEventsViewImpl {
    func update(with events: LocalEvents) {
        dataSource?.update(with: events)
    }
    
    func setCellAction(_ action: @escaping StringClosure) {
        delegateAdapter.setAction(action)
    }
    
    func setPullToRefreshAction(_ action: @escaping EmptyClosure) {
        pullToRefreshAction = action
    }
    
    func endRefreshing() {
        guard pullToRefresh.isRefreshing else { return }
        pullToRefresh.endRefreshing()
    }
}
