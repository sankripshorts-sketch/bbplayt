import Foundation
import UIKit

final class TimeDataSourceAdapter: NSObject {
    private typealias TimeDataSource = UICollectionViewDiffableDataSource<TimePickerView.Section, TimeSlot>
    
    private let collectionView: UICollectionView
    private var dataSource: TimeDataSource?
    
    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
        super.init()
        dataSource = createDataSource()
    }
    
    private func createDataSource() -> TimeDataSource {
        let dataSource = TimeDataSource(collectionView: collectionView) { collectionView, indexPath, timeSlot in
            guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: DatePickerCell.identifier, for: indexPath) as? DatePickerCell else {
                assertionFailure()
                return UICollectionViewCell()
            }
            cell.update(with: timeSlot.displayTime)
            cell.transform = CGAffineTransform(scaleX: 0.5, y: 0.5)
            return cell
        }
        return dataSource
    }
    
    func update(with timeSlots: [TimeSlot]) {
        guard var snapshot = dataSource?.snapshot() else { return }
        snapshot.deleteAllItems()
        snapshot.appendSections([TimePickerView.Section.main])
        snapshot.appendItems(timeSlots, toSection: .main)
        dataSource?.apply(snapshot)
    }
}
