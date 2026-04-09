import Foundation
import SnapKit

final class SkeletonCollectionView: UIView {
    
    private let topMask = UIView()
    private let topLayer = CAGradientLayer()
    private let botMask = UIView()
    private let botLayer = CAGradientLayer()
    
    private let collectionViewLayout = UICollectionViewFlowLayout()
    private lazy var collectionView = UICollectionView(frame: .zero, collectionViewLayout: collectionViewLayout)
    private lazy var skeletonDataSourceAdapter = SkeletonDataSource(collectionView: collectionView)
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override func updateConstraints() {
        super.updateConstraints()
        topMask.snp.updateConstraints {
            $0.top.left.right.equalToSuperview()
            $0.height.equalTo(45.scale())
        }

        botMask.snp.updateConstraints {
            $0.left.right.bottom.equalToSuperview()
            $0.height.equalTo(45.scale())
        }
    }
    
    private func setupUI() {
        collectionViewLayout.minimumLineSpacing = 16.scale()
        collectionViewLayout.scrollDirection = .vertical
        collectionViewLayout.itemSize = CGSize(width: 327.scaleIfNeeded(),
                                               height: 85.scaleIfNeeded())
        
        collectionView.dataSource = skeletonDataSourceAdapter
        collectionView.delegate = self
        collectionView.showsVerticalScrollIndicator = false
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.register(SkeletonNewsCell.self, forCellWithReuseIdentifier: SkeletonNewsCell.identifier)
        collectionView.backgroundColor = .clear
        
        addSubview(collectionView)
        collectionView.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
        
        setupTopMask()
        setupBotMask()
    }
    
    func reload() {
        collectionView.reloadData()
    }
}

extension SkeletonCollectionView {
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
            $0.top.left.right.equalToSuperview()
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
            $0.left.right.bottom.equalToSuperview()
            $0.height.equalTo(45.scale())
        }
    }
    
}

// MARK: - UICollectionViewDelegate -
extension SkeletonCollectionView: UICollectionViewDelegate {
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
extension SkeletonCollectionView {
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
