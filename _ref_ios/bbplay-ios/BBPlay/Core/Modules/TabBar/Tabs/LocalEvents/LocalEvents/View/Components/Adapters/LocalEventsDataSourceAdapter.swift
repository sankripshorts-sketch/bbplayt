import Foundation
import UIKit

final class LocalEventsDataSourceAdapter: NSObject {
    private typealias LocalEventsDataSource = UICollectionViewDiffableDataSource<LocalEventsViewImpl.Section, Event>
    
    private let collectionView: UICollectionView
    private var dataSource: LocalEventsDataSource?
    
    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
        super.init()
        dataSource = createDataSource()
        setupHeader()
    }
    
    private func createDataSource() -> LocalEventsDataSource {
        let dataSource = LocalEventsDataSource(collectionView: collectionView) { [weak self] collectionView, indexPath, event in
            guard let self else { return UICollectionViewCell() }
            guard !event.eventId.isEmpty else {
                return makeCollectionViewCell(of: LocalEventWithoutEventsCell.self, for: indexPath)
            }

            let cell = makeCollectionViewCell(of: LocalEventCell.self, for: indexPath)
            cell.update(with: event)
            return cell
        }
        return dataSource
    }
    
    private func makeCollectionViewCell<T: UICollectionViewCell>(of: T.Type, for indexPath: IndexPath) -> T {
        guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: T.identifier, for: indexPath) as? T else {
            assertionFailure()
            return T()
        }
        return cell
    }

    func update(with model: LocalEvents) {
        guard var snapshot = dataSource?.snapshot() else { return }
        snapshot.deleteAllItems()
        
        let sections = LocalEventsViewImpl.Section.allCases.filter { section in
            guard section != .noVisible else { return false }
            return model.events.contains(where: { $0.sectionType == section })}
        
        snapshot.appendSections(sections)
        
        snapshot.sectionIdentifiers.forEach { section in
            let items = model.events.filter({ $0.sectionType == section })
            snapshot.appendItems(items, toSection: section)
        }
        
        dataSource?.apply(snapshot, animatingDifferences: false)
    }
    
    private func setupHeader() {
        dataSource?.supplementaryViewProvider = { [weak self] (
            collectionView: UICollectionView,
            kind: String,
            indexPath: IndexPath) -> UICollectionReusableView? in
            
            guard let header = collectionView.dequeueReusableSupplementaryView(
                ofKind: kind,
                withReuseIdentifier: LocalEventsHeader.identifier,
                for: indexPath) as? LocalEventsHeader else { return nil }
            
            guard let sections = self?.dataSource?.snapshot().sectionIdentifiers else { return  nil }
            
            let section = sections[indexPath.section]
            
            let headerInfo: EventHeaderInfo
            switch section {
                case .reward: headerInfo = EventHeaderInfo(
                    title: Localizable.takeReward(),
                    textColor: Color.headerRewardColor()!)
                case .active: headerInfo = EventHeaderInfo(title: Localizable.comingNow())
                case .completed: headerInfo = EventHeaderInfo(
                    title: Localizable.completed(),
                    textColor: Color.headerFinishedEventColor()!)
                case .noVisible:
                    return nil
            }
            header.update(with: headerInfo)
            return header
        }
    }
}

// MARK: - EventHeaderInfo -
extension LocalEventsDataSourceAdapter {
    struct EventHeaderInfo {
        let title: String
        let textColor: UIColor
        
        init(title: String, textColor: UIColor = .white) {
            self.title = title
            self.textColor = textColor
        }
    }
}
