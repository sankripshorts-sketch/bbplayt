import Foundation
import NeedleFoundation


final class NewsComponent: Component<EmptyDependency> {
    private let navigationController = BaseNavigationController()
    
    var newsViewControllerWithNavigation: BaseNavigationController {
        let router = Router(navigationController: navigationController)
        router.push(newsScreenViewController)
        return navigationController
    }
    
    private var newsScreenViewController: NewsViewController {
        let newsNetworkModelConverter = NewsNetworkModelConverterImpl()
        let newsViewModelConverter = NewsViewModelConverterImpl()
        let presenter = NewsPresenterImpl(
            newsNetworkModelConverter: newsNetworkModelConverter,
            newsViewModelConverter: newsViewModelConverter
        )
        let viewController = NewsViewController(presenter: presenter)
        presenter.view = viewController
        return viewController
    }
}
