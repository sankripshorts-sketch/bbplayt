import Foundation
import UIKit

final class RankingDataSourceAdapter {
    
    typealias GameDataSource = UICollectionViewDiffableDataSource<Section, Game>

    private let collectionView: UICollectionView
    private var dataSource: GameDataSource?

    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
        dataSource = createDataSource()
    }

    func createDataSource() -> GameDataSource {
        let dataSource = GameDataSource(
            collectionView: collectionView,
            cellProvider: { collectionView, indexPath, game in
                guard let cell = collectionView.dequeueReusableCell(
                    withReuseIdentifier: GameCell.identifier,
                    for: indexPath) as? GameCell else {
                    logger.error("cell not created")
                    assertionFailure()
                    return UICollectionViewCell()
                }
                cell.update(with: game)
                return cell
            })
        return dataSource
    }

    func update(with games: [Game]) {
        guard var snapshot = dataSource?.snapshot() else { return }

        snapshot.deleteAllItems()
        snapshot.appendSections([Section.main])
        snapshot.appendItems(games, toSection:  Section.main)
        dataSource?.apply(snapshot)
    }
}

extension RankingDataSourceAdapter {
    enum Section {
        case main
    }
}
