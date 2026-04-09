import Foundation
import NeedleFoundation

protocol LocalEventsDependency: Dependency {
    var accountManager: AccountManager { get }
    var networkService: NetworkService { get }
}

final class LocalEventsComponent: Component<LocalEventsDependency> {
    
    private let navigationController = BaseNavigationController()
    
    var localEventsViewControllerWithNavigation: BaseNavigationController {
        let router = Router(navigationController: navigationController)
        router.push(localEventsViewController)
        return navigationController
    }
    
    private var localEventsViewController: LocalEventsViewController {
        let router = LocalEventsRouter(navigationController: navigationController)
        let presenter = LocalEventsPresenterImpl(router: router,
                                                 networkService: dependency.networkService,
                                                 accountManager: dependency.accountManager)
        let viewController = LocalEventsViewController(presenter: presenter)
        presenter.setView(viewController)
        return viewController
    }
}
