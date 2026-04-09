import Foundation
import UIKit

final class MyReserveViewDataSourceAdapter {
    typealias MyReserveDataSource = UICollectionViewDiffableDataSource<Section, MyReservePresenterImpl.CardModel>
    
    private let collectionView: UICollectionView
    private var dataSource: MyReserveDataSource?
    
    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
        dataSource = createDataSource()
    }
    
    private func createDataSource() -> MyReserveDataSource {
        let dataSource = MyReserveDataSource(
            collectionView: collectionView,
            cellProvider: { collectionView, indexPath, cardInfo in
                guard let cell = collectionView.dequeueReusableCell(
                    withReuseIdentifier: ReserveCardCell.identifier,
                    for: indexPath) as? ReserveCardCell else {
                    logger.error("cell not created")
                    assertionFailure()
                    return UICollectionViewCell()
                }
                cell.update(with: cardInfo)
                return cell
            })
        return dataSource
    }
    
    func update(with cards: [MyReservePresenterImpl.CardModel]) {
        guard var snapshot = dataSource?.snapshot() else { return }
        
        snapshot.deleteAllItems()
        snapshot.appendSections([Section.main])
        snapshot.appendItems(cards, toSection:  Section.main)
        dataSource?.apply(snapshot)
    }
}

extension MyReserveViewDataSourceAdapter {
    enum Section {
        case main
    }
}
