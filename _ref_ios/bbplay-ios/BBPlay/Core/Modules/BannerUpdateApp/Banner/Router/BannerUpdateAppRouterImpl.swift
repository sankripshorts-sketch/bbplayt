import Foundation
import UIKit

final class BannerUpdateAppRouterImpl: BannerUpdateAppRouter {
    private weak var navigationController: UINavigationController?

    init(
        navigationController: UINavigationController?
    ) {
        self.navigationController = navigationController
    }

    func openAppStore(by url: URL) {
        navigationController?.openDeeplink(url)
    }

    func showError(message: String) {
        let alertController = UIAlertController(
            title: Localizable.error(),
            message: message,
            preferredStyle: .alert
        )

        alertController.addAction(UIAlertAction(title: Localizable.okey(), style: .default))
        navigationController?.present(alertController, animated: true)
    }
}
