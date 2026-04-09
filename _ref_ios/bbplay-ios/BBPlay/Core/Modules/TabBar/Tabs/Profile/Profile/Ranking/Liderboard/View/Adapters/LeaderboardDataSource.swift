import Foundation
import UIKit

typealias LeaderboardDataSource = UICollectionViewDiffableDataSource<Int, Rank>

final class LeaderboardDataSourceAdapter {

    private let collectionView: UICollectionView
    private var sortType: SortType = .kills
    
    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
    }
    
    private let sectionNumber = 0
    private lazy var dataSourse: LeaderboardDataSource = LeaderboardDataSource(
        collectionView: collectionView,
        cellProvider: { [weak self] collectionView, indexPath, info in
            guard let self = self,
                  let cell = collectionView.dequeueReusableCell(
                withReuseIdentifier: LeaderboardCell.identifier,
                for: indexPath) as? LeaderboardCell else {
                logger.error("cell not created")
                assertionFailure()
                return UICollectionViewCell()
            }
            cell.update(with: info, index: indexPath.row + 1, and: self.sortType)
            return cell
        })

    func update(with rank: [Rank], sortType: SortType) {
        self.sortType = sortType
        let section = [sectionNumber]
        
        guard let element = section.first else {
            logger.error("\(self) section nil")
            assertionFailure()
            return
        }
        var snapshot = NSDiffableDataSourceSnapshot<Int, Rank>()
        snapshot.appendSections(section)
        snapshot.appendItems(rank, toSection: element)
        dataSourse.apply(snapshot, animatingDifferences: false, completion: nil)
        collectionView.reloadData()
    }
}
