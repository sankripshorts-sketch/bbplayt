import Foundation
import UIKit

final class ClubsDataSourceAdapter {
    
    typealias ClubsDataSource = UICollectionViewDiffableDataSource<Section, ClubModel>
    
    private let collectionView: UICollectionView
    private var dataSource: ClubsDataSource?
    
    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
        dataSource = createDataSource()
    }
    
    private func createDataSource() -> ClubsDataSource {
        let dataSource = ClubsDataSource(
            collectionView: collectionView,
            cellProvider: { collectionView, indexPath, club in
                guard let cell = collectionView.dequeueReusableCell(
                    withReuseIdentifier: ClubCardCell.identifier,
                    for: indexPath) as? ClubCardCell else {
                    logger.error("cell not created")
                    assertionFailure()
                    return UICollectionViewCell()
                }
                cell.update(with: club)
                return cell
            })
        return dataSource
    }
}

// MARK: - Update -
extension ClubsDataSourceAdapter {
    func update(with clubs: [ClubModel]) {
        guard var snapshot = dataSource?.snapshot() else { return }
        
        snapshot.deleteAllItems()
        snapshot.appendSections([Section.main])
        snapshot.appendItems(clubs, toSection: Section.main)
        dataSource?.apply(snapshot)
    }
}

extension ClubsDataSourceAdapter {
    enum Section {
        case main
    }
}
