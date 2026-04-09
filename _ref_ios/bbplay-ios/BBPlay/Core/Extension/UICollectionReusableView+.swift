import Foundation
import UIKit

// MARK: - Identifier -
extension UICollectionReusableView {
    static var identifier: String {
        return NSStringFromClass(self)
    }
}
