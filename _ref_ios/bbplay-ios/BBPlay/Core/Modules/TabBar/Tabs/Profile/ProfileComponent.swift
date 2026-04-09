import Foundation
import NeedleFoundation

protocol ProfileComponentDependency: Dependency {
    var analyticsManager: AnalyticsManager { get }
    var authManager: AuthManager { get }
    var networkService: NetworkService { get }
    var verificationPhoneService: VerificationPhoneService { get }
}

final class ProfileComponent: Component<ProfileComponentDependency> {
    
    private let profileNavigationController = BaseNavigationController()
    
    var profileViewControllerWithNavigation: BaseNavigationController {
        let router = Router(navigationController: profileNavigationController)
        router.push(profileContainerViewController)
        return profileNavigationController
    }
    
    private var profileScreenComponentFactory: ProfileScreenComponentFactory { ProfileScreenComponentFactory(
        navigationController: profileNavigationController,
        authManager: dependency.authManager,
        analyticsManager: dependency.analyticsManager,
        networkService: dependency.networkService,
        verificationPhoneService: dependency.verificationPhoneService)
    }
    
    private var profileContainerViewController: ProfileContainerViewController {
        ProfileContainerViewController(authManager: dependency.authManager,
                                       componentFactory: profileScreenComponentFactory)
    }
}
