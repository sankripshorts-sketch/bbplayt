import Foundation
import SnapKit

final class DurationCollectionView: UIView {
    
    private let collectionViewHeight: CGFloat
    private let cellHeight: CGFloat
    
    private var productSelectedAction: ((Int) -> Void)?
    
    private lazy var collectionView = UICollectionView(frame: .zero,
                                                       collectionViewLayout: makeLayout())
    private var dataSource: DurationDataSourceAdapter?
    
    private var centerCell: PickerItemCell? {
        willSet {
            guard let newValue, newValue != centerCell,
                  let index = getCellIndex() else { return }
            productSelectedAction?(index)
        }
    }

    init(_ collectionViewHeight: CGFloat,
         _ cellHeight: CGFloat) {
        self.collectionViewHeight = collectionViewHeight
        self.cellHeight = cellHeight
        super.init(frame: .zero)
        dataSource = DurationDataSourceAdapter(collectionView)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    private func makeLayout() -> UICollectionViewCompositionalLayout {
        let itemSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0),
                                              heightDimension: .fractionalHeight(1.0))
        let item = NSCollectionLayoutItem(layoutSize: itemSize)
        
        let groupSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0),
                                               heightDimension: .absolute(cellHeight))
        let group = NSCollectionLayoutGroup.vertical(layoutSize: groupSize, subitems: [item])
        
        let section = NSCollectionLayoutSection(group: group)
        
        let inset = collectionViewHeight / 2 - cellHeight / 2
        section.contentInsets = .init(top: inset,
                                      leading: 0,
                                      bottom: inset + 1,
                                      trailing: 0)
        
        let layout = UICollectionViewCompositionalLayout(section: section)
        layout.configuration.scrollDirection = .vertical
        return layout
    }
    
    private func setupUI() {
        setupCollectionView()
    }
    
    private func setupCollectionView() {
        collectionView.backgroundColor = .clear
        collectionView.delegate = self
        collectionView.showsVerticalScrollIndicator = false
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.register(DurationPickerCell.self, forCellWithReuseIdentifier: DurationPickerCell.identifier)
        
        addSubview(collectionView)
        collectionView.snp.makeConstraints { $0.edges.equalToSuperview() }
    }
    
    private func updateScrollViewDidScroll() {
        scrollViewDidScroll(collectionView, animated: false)
    }

    private func getCellIndex() -> Int? {
        let centerPoint = CGPoint(x: self.collectionView.center.x,
                                  y: self.collectionView.bounds.height / 2 + self.collectionView.bounds.origin.y)
        guard let indexPath = collectionView.indexPathForItem(at: centerPoint) else { return nil }
        return indexPath.row
    }
}

// MARK: - Public -
extension DurationCollectionView {
    func updateProducts(with products: [ProductDisplayItem]) {
        dataSource?.update(with: products)
        updateScrollViewDidScroll()
    }
    
    func scrollToItem(on index: Int) {
        let indexPath = IndexPath(row: index, section: 0)
        collectionView.scrollToItem(at: indexPath,
                                    at: .centeredVertically,
                                    animated: false)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            self.updateScrollViewDidScroll()
        }
    }

    func setProductSelectedAction(_ action: @escaping (Int) -> Void) {
        productSelectedAction = action
    }
}

// MARK: - UICollectionViewDelegate
extension DurationCollectionView: UICollectionViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        scrollViewDidScroll(scrollView, animated: true)
    }
    
    func scrollViewDidScroll(_ scrollView: UIScrollView, animated: Bool) {
        let centerPoint = CGPoint(x: collectionView.center.x,
                                  y: collectionView.frame.height / 2 + scrollView.contentOffset.y)
        
        let allVisibleCells = collectionView.indexPathsForVisibleItems
        guard let index = collectionView.indexPathForItem(at: centerPoint),
              let centerCell = collectionView.cellForItem(at: index) as? PickerItemCell else { return }
        self.centerCell = centerCell
        
        let beforeToCurrent = allVisibleCells.compactMap({ element -> IndexPath? in
            guard element.row < index.row else { return nil }
            return element
        }).sorted(by: { $0 > $1 })
        
        let afterFromCurrent = allVisibleCells.compactMap({ element -> IndexPath? in
            guard element.row > index.row else { return nil }
            return element
        }).sorted(by: { $0 < $1 })
        
        let duration: TimeInterval = animated ? 0.3 : 0.0001
        UIView.animate(withDuration: duration, delay: 0, animations: { [self] in
            let positionRelativeCollectionView = collectionView.convert(centerCell.frame, to: collectionView).origin.y - scrollView.contentOffset.y + centerCell.bounds.height / 2
            let ratioOffset = positionRelativeCollectionView / collectionView.frame.height
            
            var scaleValue: CGFloat = 1
            
            if centerPoint.y > centerCell.frame.midY {
                scaleValue = 0.8 + (2 * ratioOffset) * (1 - 0.8)
            }
            else if centerPoint.y < centerCell.frame.midY {
                scaleValue = 0.8 + (2 * (1 - ratioOffset)) * (1 - 0.8)
            }
            
            beforeToCurrent.animateElementPickerView(with: collectionView, inverted: true, offset: ratioOffset)
            centerCell.transform = CGAffineTransform(scaleX: scaleValue, y: scaleValue)
            centerCell.updateTextColor(with: .white)
            
            afterFromCurrent.animateElementPickerView(with: collectionView, offset: ratioOffset)
        })
    }
    
    private func scrollToItem(with scrollView: UIScrollView) {
        let centerPoint = CGPoint(x: collectionView.center.x,
                                  y: collectionView.frame.height / 2 + scrollView.contentOffset.y)
        guard let index = collectionView.indexPathForItem(at: centerPoint) else { return }
        
        guard !scrollView.isDragging else { return }
        collectionView.scrollToItem(at: index,
                                    at: .centeredVertically,
                                    animated: true)
    }
    
    func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
        scrollToItem(with: scrollView)
    }
    
    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        scrollToItem(with: scrollView)
    }
    
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        collectionView.scrollToItem(
            at: indexPath,
            at: .centeredVertically,
            animated: true)
    }
}
