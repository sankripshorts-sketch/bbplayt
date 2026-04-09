import Foundation
import UIKit

final class LocalEventDataSourceAdapter {
    
    typealias LocalEventDataSource = UICollectionViewDiffableDataSource<Section<Header, Item>, Item>
    
    private let collectionView: UICollectionView
    private var dataSource: LocalEventDataSource?
    
    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
        dataSource = makeDataSource()
        setupHeader()
    }
}

// MARK: - Private -
private extension LocalEventDataSourceAdapter {
    func makeDataSource() -> LocalEventDataSource {
        let dataSource = LocalEventDataSource(collectionView: collectionView) { collectionView, indexPath, item in
            guard let section = LocalEventViewImpl.CVSection(rawValue: indexPath.section) else {
                assertionFailure()
                return UICollectionViewCell()
            }
            
            switch section {
                case .winningPlace:
                    guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: LocalEventPlaceCell.identifier, for: indexPath) as? LocalEventPlaceCell else {
                        assertionFailure()
                        return UICollectionViewCell()
                    }
                    cell.update(with: item.cellType)
                    return cell
                case .topPlayer:
                    guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: LeaderboardCell.identifier, for: indexPath) as? LeaderboardCell else {
                        assertionFailure()
                        return UICollectionViewCell()
                    }
                    cell.update(with: item.cellInfo.nickname,
                                rank: item.cellInfo.rank,
                                rankCurrentPlayer: item.cellInfo.currentPlayerRank,
                                and: item.cellInfo.points)
                    return cell
            }
        }
        return dataSource
    }
    
    func setupHeader() {
        dataSource?.supplementaryViewProvider = { [weak self] (
            collectionView: UICollectionView,
            kind: String,
            indexPath: IndexPath) -> UICollectionReusableView? in

            guard let section = self?.dataSource?.snapshot().sectionIdentifiers[indexPath.section] else { return nil }

            switch section.sectionType {
                case .winningPlace:
                    guard let header = collectionView.dequeueReusableSupplementaryView(
                        ofKind: kind,
                        withReuseIdentifier: MainLocalEventHeader.identifier,
                        for: indexPath) as? MainLocalEventHeader else { return nil }
                    header.update(with: section.header)
                    return header
                case .topPlayer:
                    guard let header = collectionView.dequeueReusableSupplementaryView(
                        ofKind: kind,
                        withReuseIdentifier: LocalEventHeader.identifier,
                        for: indexPath) as? LocalEventHeader else { return nil }
                    return header
            }
        }
    }
}

// MARK: - Public -
extension LocalEventDataSourceAdapter {
    func update(with event: LocalEvent<Section<Header, Item>>) {
        guard var snapshot = dataSource?.snapshot() else { return }
        snapshot.deleteAllItems()
        snapshot.appendSections(event.sections)
        
        snapshot.sectionIdentifiers.forEach { section in
            snapshot.appendItems(section.items, toSection: section)
        }
        dataSource?.apply(snapshot)
    }
}
