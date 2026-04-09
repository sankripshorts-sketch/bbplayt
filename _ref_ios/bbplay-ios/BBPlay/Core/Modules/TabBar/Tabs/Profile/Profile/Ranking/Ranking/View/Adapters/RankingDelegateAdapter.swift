import Foundation
import UIKit

final class RankingDelegateAdapter: NSObject, UICollectionViewDelegate {

    private var action: ((GameType) -> Void)?

    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        guard let cell = collectionView.cellForItem(at: indexPath) as? GameCell else {
            logger.info("\(self), cell not casted")
            assertionFailure()
            return
        }

        guard let cellType = cell.type else {
            logger.error("\(self), type cell is nil")
            return
        }

        action?(cellType)
    }

    func setAction(_ action: @escaping ((GameType) -> Void)) {
        self.action = action
    }
}
