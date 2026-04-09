import Foundation
import NeedleFoundation

protocol ClubsComponentDependency: Dependency {
    var maps: Maps { get }
    var phoneCall: PhoneCall { get }
    var socialMedia: SocialMedia { get }
    var clubsManager: ClubsManager { get }
}

final class ClubsComponent: Component<ClubsComponentDependency> {
    private let navigationController = BaseNavigationController()
    
    var clubsViewControllerWithNavigation: BaseNavigationController {
        let router = Router(navigationController: navigationController)
        router.push(clubsViewController)
        return navigationController
    }
    
    private var clubsViewController: ClubsViewController {
        let router = ClubsRouter(navigationController: navigationController)
        let presenter = ClubsPresenterImpl(router: router,
                                           maps: dependency.maps,
                                           phoneCall: dependency.phoneCall,
                                           socialMedia: dependency.socialMedia,
                                           clubsManager: dependency.clubsManager)
        let viewController = ClubsViewController(presenter: presenter)
        presenter.setView(viewController)
        return viewController
    }
}
