import Foundation
import UIKit

final class ReplanishDelegateAdapter: NSObject, UICollectionViewDelegate {
    
    private var action: ((Int) -> Void)?
    
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        action?(indexPath.row)
    }

    func setAction(_ action: @escaping ((Int) -> Void)) {
        self.action = action
    }
}
