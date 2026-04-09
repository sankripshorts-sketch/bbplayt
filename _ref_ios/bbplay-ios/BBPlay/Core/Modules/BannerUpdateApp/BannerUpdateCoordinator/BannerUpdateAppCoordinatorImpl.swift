import Foundation

final class BannerUpdateAppCoordinatorImpl: BannerUpdateAppCoordinator {
    
    private let bannerUpdateAppService: BannerUpdateAppService
    private let windowPresenter: BannerUpdateAppWindowPresenter
    private let bannerUpdateBuilder: BannerUpdateAppBuilder
    
    init(
        bannerUpdateAppService: BannerUpdateAppService,
        windowPresenter: BannerUpdateAppWindowPresenter,
        bannerUpdateBuilder: BannerUpdateAppBuilder
    ) {
        self.bannerUpdateAppService = bannerUpdateAppService
        self.windowPresenter = windowPresenter
        self.bannerUpdateBuilder = bannerUpdateBuilder
    }
    
    func start() {
        Task {
            let needUpdateApp = await bannerUpdateAppService.checkForUpdates()
            
            if needUpdateApp {
                await presentBannerUpdate()
            }
        }
    }

    @MainActor
    private func presentBannerUpdate() {
        let viewController = bannerUpdateBuilder.build()
        windowPresenter.present(viewController: viewController)
    }
}
