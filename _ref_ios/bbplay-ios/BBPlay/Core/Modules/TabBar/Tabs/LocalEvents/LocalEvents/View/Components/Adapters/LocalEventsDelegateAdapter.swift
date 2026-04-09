import Foundation
import UIKit

final class LocalEventsDelegateAdapter: NSObject, UICollectionViewDelegate {

    private var action: StringClosure?

    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        guard let cell = collectionView.cellForItem(at: indexPath) as? LocalEventCell else { return }

        guard let eventId = cell.eventId else {
            assertionFailure()
            return
        }

        action?(eventId)
    }
}

// MARK: - Public -
extension LocalEventsDelegateAdapter {
    func setAction(_ action: @escaping StringClosure) {
        self.action = action
    }
}
