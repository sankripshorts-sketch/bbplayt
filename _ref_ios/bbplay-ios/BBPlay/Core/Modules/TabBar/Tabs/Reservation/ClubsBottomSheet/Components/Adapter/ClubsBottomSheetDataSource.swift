import Foundation
import UIKit

typealias ClubsBottomSheetDataSource = UICollectionViewDiffableDataSource<Int, ClubsInfo>

final class ClubsBottomSheetDataSourceAdapter {
    
    private let collectionView: UICollectionView
    
    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
    }
    
    private lazy var dataSource = ClubsBottomSheetDataSource(
        collectionView: collectionView,
        cellProvider: { [weak self] collectionView, indexPath, section in
            switch section.type {
                case .adress:
                    guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: ClubsBottomSheetCell.identifier,
                        for: indexPath) as? ClubsBottomSheetCell else {
                        logger.warning("cell is nil")
                        assertionFailure()
                        return UICollectionViewCell()
                    }
                cell.update(with: section.isSelected, adress: section.adress)
                    return cell

                case .newClub:
                    guard let newClubCell = collectionView.dequeueReusableCell(withReuseIdentifier: NewClubsBottomSheetCell.identifier,
                        for: indexPath) as? NewClubsBottomSheetCell else {
                        logger.warning("cell is nil")
                        assertionFailure()
                        return UICollectionViewCell()
                    }
                    newClubCell.update(with: section.isSelected)
                    return newClubCell
            }
        })
    
    func updateClubCell(adress: String) {
        let collections = [
            ClubsInfo(isSelected: true, type: .adress, adress: adress),
            ClubsInfo(isSelected: false, type: .newClub, adress: adress)
        ]
        
        var snapshot = NSDiffableDataSourceSnapshot<Int, ClubsInfo>()
        snapshot.appendSections([0])
        snapshot.appendItems(collections)
        dataSource.apply(snapshot, animatingDifferences: false, completion: nil)
    }
}
