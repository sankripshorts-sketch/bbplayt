import Foundation
import UIKit

final class DatePickerDataSourceAdapter: NSObject {
    private typealias DatePickerDataSource = UICollectionViewDiffableDataSource<
        DatePickerViewImpl.Section, DatePickerPresenterImpl.DatePicker.Day
    >

    private let collectionView: UICollectionView
    private var dataSource: DatePickerDataSource?
    
    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
        super.init()
        dataSource = createDataSource()
    }
    
    private func createDataSource() -> DatePickerDataSource {
        let dataSource = DatePickerDataSource(collectionView: collectionView) { collectionView, indexPath, date in
            guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: DatePickerCell.identifier, for: indexPath) as? DatePickerCell else {
                assertionFailure()
                return UICollectionViewCell()
            }
            cell.update(with: date.day)
            cell.transform = CGAffineTransform(scaleX: 0.5, y: 0.5)
            return cell
        }
        return dataSource
    }

    func update(with text: DatePickerPresenterImpl.DatePicker) {
        guard var snapshot = dataSource?.snapshot() else { return }
        snapshot.deleteAllItems()
        snapshot.appendSections([DatePickerViewImpl.Section.main])
        snapshot.appendItems(text.dates, toSection: .main)
        dataSource?.apply(snapshot)
    }
}
