import Foundation
import SnapKit

final class NewsViewImpl: UIView {
    
    private var postTapAction: IntClosure?
    private var refreshAction: ((Bool) -> Void)?
    
    private let pullToRefresh = UIRefreshControl()
    private let collectionViewLayout = UICollectionViewFlowLayout()
    private lazy var collectionView = UICollectionView(
        frame: .zero,
        collectionViewLayout: collectionViewLayout)
    private lazy var dataSourceAdapter = NewsDataSourceAdapter(collectionView)
    private lazy var skeletonView = SkeletonCollectionView()
    
    private let topMask = UIView()
    private let topLayer = CAGradientLayer()
    private let botMask = UIView()
    private let botLayer = CAGradientLayer()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        collectionView.delegate = self
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override func updateConstraints() {
        super.updateConstraints()
        collectionView.snp.updateConstraints {
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom + tabBarHeight)
        }

        botMask.snp.updateConstraints {
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom + tabBarHeight)
        }
        
        skeletonView.snp.updateConstraints {
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom + tabBarHeight)
        }
    }
    
    private func setupUI() {
        backgroundColor = Color.background()
        
        setupCollectionView()
        setupSkeletonView()
        setupNewsFeedLayout()
        setupTopMask()
        setupBotMask()
        setupPullToRefresh()
    }
    
    private func setupSkeletonView() {
        skeletonView.alpha = 0
        addSubview(skeletonView)
        skeletonView.snp.makeConstraints {
            $0.top.equalToSuperview().inset(64.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom + tabBarHeight)
        }
    }
    
    private func setupCollectionView() {
        collectionView.alpha = 0
        collectionView.backgroundColor = Color.background()
        collectionView.showsVerticalScrollIndicator = false
        collectionView.showsHorizontalScrollIndicator = false
        
        addSubview(collectionView)
        collectionView.snp.makeConstraints {
            $0.top.equalToSuperview().inset(64.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom + tabBarHeight)
        }
        
        collectionView.register(NewsCell.self, forCellWithReuseIdentifier: NewsCell.identifier)
    }
    
    private func setupNewsFeedLayout() {
        collectionViewLayout.minimumLineSpacing = 16.scale()
        collectionViewLayout.scrollDirection = .vertical
        collectionViewLayout.estimatedItemSize = UICollectionViewFlowLayout.automaticSize
    }
    
    private func setupTopMask() {
        topLayer.colors = [
            Color.gradientRanking()!
            .withAlphaComponent(1)
            .cgColor,
            Color.gradientRanking()!
            .withAlphaComponent(0)
            .cgColor]
        topLayer.frame = CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 45.scale())
        
        topMask.isUserInteractionEnabled = false
        topMask.alpha = 0
        topMask.layer.addSublayer(topLayer)
        addSubview(topMask)
        
        topMask.snp.makeConstraints {
            $0.top.equalTo(collectionView.snp.top)
            $0.left.right.equalToSuperview()
            $0.height.equalTo(45.scale())
        }
    }
    
    private func setupBotMask() {
        botLayer.colors = [
            Color.gradientRanking()!
                .withAlphaComponent(0)
                .cgColor,
            
            Color.gradientRanking()!
                .withAlphaComponent(1)
                .cgColor]
        botLayer.frame = CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 45.scale())
        
        botMask.isUserInteractionEnabled = false
        botMask.alpha = 1
        botMask.layer.addSublayer(botLayer)
        addSubview(botMask)
        
        botMask.snp.makeConstraints {
            $0.left.right.equalToSuperview()
            $0.height.equalTo(45.scale())
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom + tabBarHeight)
        }
    }
    
    private func setupPullToRefresh() {
        pullToRefresh.addTarget(self, action: #selector(refreshSwipe), for: .primaryActionTriggered)
        collectionView.addSubview(pullToRefresh)
    }
    
    @objc private func refreshSwipe() {
        refreshAction?(pullToRefresh.isRefreshing)
    }
}

// MARK: - Public -
extension NewsViewImpl {
    func update(with news: [NewsPost]) {
        dataSourceAdapter.update(with: news)
        botMask.alpha = 1
    }
    
    func showSkeleton() {
        skeletonView.alpha = 1
        collectionView.alpha = 0
        skeletonView.reload()
    }

    func hideSkeleton() {
        collectionView.alpha = 1
        skeletonView.alpha = 0
    }
    
    func endRefreshing() {
        pullToRefresh.endRefreshing()
    }
    
    func setPullToRefreshAction(_ action: @escaping BoolClosure) {
        self.refreshAction = action
    }
    
    func setPostTapAction(_ action: @escaping IntClosure) {
        self.postTapAction = action
    }
}

// MARK: - UICollectionViewDelegate -
extension NewsViewImpl: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        guard let cell = collectionView.cellForItem(at: indexPath) as? NewsCell,
              let postId = cell.postId else { return }
        postTapAction?(postId)
    }
    
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        let scrollOffset = collectionView.contentOffset.y
        switchingMask(offset: scrollOffset)
        
        UIView.animate(withDuration: 0.2) { [self] in
            if scrollView.contentOffset.y >=  scrollView.contentSize.height - scrollView.frame.height {
                botMask.alpha = 0
            } else {
                botMask.alpha = 1
            }
        }
    }
}

// MARK: - Switching Mask -
extension NewsViewImpl {
    private func switchingMask(offset: Double) {
        UIView.animate(withDuration: 0.2) { [self] in
            if offset <= 0 {
                maskOff()
            } else {
                maskOn()
            }
        }
    }
    
    private func maskOn() {
        topMask.alpha = 1
    }
    
    private func maskOff() {
        topMask.alpha = 0
    }
}
