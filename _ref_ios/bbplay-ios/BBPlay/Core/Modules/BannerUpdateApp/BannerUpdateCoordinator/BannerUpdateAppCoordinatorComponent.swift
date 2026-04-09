import Foundation
import NeedleFoundation

protocol BannerUpdateAppCoordinatorComponentDependency: Dependency {
    var navigationController: UINavigationController { get }
    var proxyNetworkService: NetworkServiceProtocol { get }
}

final class BannerUpdateAppCoordinatorComponent: Component<BannerUpdateAppCoordinatorComponentDependency> {
    func makeCoordinator(with windowScene: UIWindowScene) -> BannerUpdateAppCoordinator {
        let bannerUpdateAppService = BannerUpdateAppServiceImpl(
            proxyNetworkService: dependency.proxyNetworkService
        )
        let windowPresenter = BannerUpdateAppWindowPresenterImpl(
            windowScene: windowScene
        )
        let bannerUpdateAppCoordinator = BannerUpdateAppCoordinatorImpl(
            bannerUpdateAppService: bannerUpdateAppService,
            windowPresenter: windowPresenter,
            bannerUpdateBuilder: bannerUpdateBuilder
        )
        return bannerUpdateAppCoordinator
    }

    private var bannerUpdateBuilder: BannerUpdateAppComponent {
        BannerUpdateAppComponent(parent: self)
    }
}
