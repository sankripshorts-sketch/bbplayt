import Foundation
import UIKit

enum NewsCellType {
    case cellWithoutImage
    case cellWithImage
}

final class NewsDataSourceAdapter {
    typealias NewsDataSource = UICollectionViewDiffableDataSource<Section, NewsPost>

    private let collectionView: UICollectionView
    private var dataSource: NewsDataSource?
    
    init(_ collectionView: UICollectionView) {
        self.collectionView = collectionView
        self.dataSource = createDataSource()
    }

    func update(with newsPost: [NewsPost]) {
        guard var snapshot = dataSource?.snapshot() else { return }
        snapshot.deleteAllItems()
        snapshot.appendSections([Section.main])
        snapshot.appendItems(newsPost, toSection: Section.main)
        dataSource?.apply(snapshot, animatingDifferences: false)
    }

    private func createDataSource() -> NewsDataSource {
        let dataSource = NewsDataSource(
            collectionView: collectionView,
            cellProvider: { collectionView, indexPath, newsPost in
                guard let cell = collectionView.dequeueReusableCell(
                    withReuseIdentifier: NewsCell.identifier,
                    for: indexPath) as? NewsCell else {
                    logger.error("cell not created")
                    assertionFailure()
                    return UICollectionViewCell()
                }
                cell.update(with: newsPost)
                cell.layer.cornerRadius = 8
                return cell
            })
        return dataSource
    }
}

extension NewsDataSourceAdapter {
    enum Section {
        case main
    }
}
