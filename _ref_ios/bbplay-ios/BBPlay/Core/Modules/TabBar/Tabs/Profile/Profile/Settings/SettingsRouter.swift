import Foundation
import UIKit

final class SettingsRouter: Router {
    func showErrorAlert(with message: String) {
        let alert = UIAlertController(title: Localizable.error(), message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: Localizable.okey(),
                                      style: .default,
                                      handler: nil))
        present(alert, animated: true)
    }
    
    func showSuccessAlert(with message: String) {
        let alert = UIAlertController(title: Localizable.success(), message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: Localizable.okey(),
                                      style: .default,
                                      handler: nil))
        present(alert, animated: true)
    }
}
