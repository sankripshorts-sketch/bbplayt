import Foundation
import NeedleFoundation

protocol BannerUpdateDependency: Dependency {
    var navigationController: UINavigationController { get }
}

final class BannerUpdateAppComponent: Component<BannerUpdateDependency> {
    private var viewController: UIViewController {
        let router = BannerUpdateAppRouterImpl(
            navigationController: dependency.navigationController
        )
        let output = BannerUpdateAppPresenter(
            router: router
        )
        let viewConteroller = BannerUpdateAppViewController(output: output)
        output.viewInput = viewConteroller
        return viewConteroller
    }
}

// MARK: - BannerUpdateAppBuilder -
extension BannerUpdateAppComponent: BannerUpdateAppBuilder {
    func build() -> UIViewController {
        return viewController
    }
}
