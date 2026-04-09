import Foundation
import UIKit

final class DurationDataSourceAdapter: NSObject {
    private typealias ProductDataSource = UICollectionViewDiffableDataSource<TimePickerView.Section, ProductDisplayItem>
    
    private let collectionView: UICollectionView
    private var dataSource: ProductDataSource?
    
    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
        super.init()
        dataSource = createDataSource()
    }
    
    private func createDataSource() -> ProductDataSource {
        let dataSource = ProductDataSource(collectionView: collectionView) { collectionView, indexPath, product in
            guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: DurationPickerCell.identifier, for: indexPath) as? DurationPickerCell else {
                assertionFailure()
                return UICollectionViewCell()
            }
            cell.update(with: product)
            cell.transform = CGAffineTransform(scaleX: 0.5, y: 0.5)
            return cell
        }
        return dataSource
    }
    
    func update(with products: [ProductDisplayItem]) {
        guard var snapshot = dataSource?.snapshot() else { return }
        snapshot.deleteAllItems()
        snapshot.appendSections([TimePickerView.Section.main])
        snapshot.appendItems(products, toSection: .main)
        dataSource?.apply(snapshot, animatingDifferences: false)
    }
}
