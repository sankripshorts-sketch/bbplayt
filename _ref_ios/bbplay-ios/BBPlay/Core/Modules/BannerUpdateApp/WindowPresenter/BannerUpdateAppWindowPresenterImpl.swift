import Foundation
import UIKit

final class BannerUpdateAppWindowPresenterImpl {
    private let windowScene: UIWindowScene
    private var window: UIWindow?

    private lazy var link: EmptyClosure = { _ = self.window }

    init(
        windowScene: UIWindowScene
    ) {
        self.windowScene = windowScene
    }

    private func setupWindow(rootViewController: UIViewController) {
        window = UIWindow(windowScene: windowScene)
        window?.windowLevel = .alert + 1
        window?.backgroundColor = .black
        window?.rootViewController = rootViewController
        window?.makeKeyAndVisible()
        link()
    }
}

// MARK: - BannerUpdateAppWindowPresenter -
extension BannerUpdateAppWindowPresenterImpl: BannerUpdateAppWindowPresenter {
    func present(viewController: UIViewController) {
        setupWindow(rootViewController: viewController)
    }
}
