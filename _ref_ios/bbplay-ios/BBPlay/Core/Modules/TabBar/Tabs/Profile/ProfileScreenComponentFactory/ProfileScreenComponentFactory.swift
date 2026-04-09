import Foundation

final class ProfileScreenComponentFactory {
    
    private let navigationController: BaseNavigationController
    private let authManager: AuthManager
    private let analyticsManager: AnalyticsManager
    private let networkService: NetworkService
    private let verificationPhoneService: VerificationPhoneService

    init(navigationController: BaseNavigationController,
         authManager: AuthManager,
         analyticsManager: AnalyticsManager,
         networkService: NetworkService,
         verificationPhoneService: VerificationPhoneService) {
        self.navigationController = navigationController
        self.authManager = authManager
        self.analyticsManager = analyticsManager
        self.networkService = networkService
        self.verificationPhoneService = verificationPhoneService
    }

    func makeLoginViewController() -> LoginViewController {
        let router = LoginRouter(analyticsManager: analyticsManager,
                                 networkService: networkService,
                                 authManager: authManager,
                                 verificationPhoneService: verificationPhoneService,
                                 navigationController: navigationController)
        let presenter = LoginPresenterImpl(router: router,
                                           authManager: authManager,
                                           analyticsManager: analyticsManager)
        let viewController = LoginViewController(presenter: presenter)
        presenter.setView(viewController)
        return viewController
    }

    func makeProfileViewController() -> ProfileViewController {
        let router = ProfileRouter(authManager: authManager,
                                   analyticsManager: analyticsManager,
                                   networkService: networkService,
                                   navigationController: navigationController)
        let presenter = ProfilePresenterImpl(router: router,
                                             authManager: authManager,
                                             analyticsManager: analyticsManager)
        let viewController =  ProfileViewController(presenter: presenter)
        presenter.view = viewController
        return viewController
    }
}
