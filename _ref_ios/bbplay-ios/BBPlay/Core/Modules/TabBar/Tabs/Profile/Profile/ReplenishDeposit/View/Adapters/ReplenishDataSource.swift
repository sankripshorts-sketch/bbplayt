import Foundation
import UIKit


final class ReplenishDataSourseAdapter {
    
    typealias ReplenishDataSource = UICollectionViewDiffableDataSource<Section, Int>
    
    private let collectionView: UICollectionView
    private var dataSource: ReplenishDataSource?

    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
        self.dataSource = createDataSource()
    }

    func updateReplenishCell(with fastAmount: [Int]) {
        guard var snapshot = dataSource?.snapshot() else {
            logger.warning("dataSource is nil")
            assertionFailure()
            return
        }
        snapshot.appendSections([Section.main])
        snapshot.appendItems(fastAmount, toSection: Section.main)
        dataSource?.apply(snapshot)
    }
    
    private func createDataSource() -> ReplenishDataSource {
        let dataSource = ReplenishDataSource(collectionView: collectionView,
                                             cellProvider: { collectionView, indexPath, amountValue in
            guard let cell = collectionView.dequeueReusableCell(
                withReuseIdentifier: ReplenishCell.identifier,
                for: indexPath) as? ReplenishCell else {
                logger.error("cell not created")
                assertionFailure()
                return UICollectionViewCell()
            }
            cell.updateCell(with: amountValue)
            return cell
        })
        return dataSource
    }
}

extension ReplenishDataSourseAdapter {
    enum Section {
        case main
    }
}
