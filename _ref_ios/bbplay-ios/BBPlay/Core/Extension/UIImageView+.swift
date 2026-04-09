import Foundation
import UIKit

//MARK: - Load image -
extension UIImageView {
    func load(url: URL, completion: @escaping EmptyClosure) {
        DispatchQueue.global().async { [weak self] in
            if let data = try? Data(contentsOf: url) {
                if let image = UIImage(data: data) {
                    DispatchQueue.main.async {
                        self?.image = image
                        completion()
                    }
                }
            }
        }
    }
}
