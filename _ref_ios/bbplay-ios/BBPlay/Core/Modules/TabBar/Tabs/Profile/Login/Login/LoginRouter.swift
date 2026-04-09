import Foundation
import UIKit

final class LoginRouter: Router {
    
    private let analyticsManager: AnalyticsManager
    private let networkService: NetworkService
    private let authManager: AuthManager
    private let verificationPhoneService: VerificationPhoneService
    
    init(analyticsManager: AnalyticsManager,
         networkService: NetworkService,
         authManager: AuthManager,
         verificationPhoneService: VerificationPhoneService,
         navigationController: UINavigationController?){
        self.analyticsManager = analyticsManager
        self.networkService = networkService
        self.authManager = authManager
        self.verificationPhoneService = verificationPhoneService
        super.init(navigationController: navigationController)
    }

    @MainActor
    func openVerificationPhone(with userData: UserData) {
        let viewController = makeVerificationPhoneViewController(with: userData)
        push(viewController)
        super.needShowNavigationBar()
    }

    func openRegistrationAccount() {
        let viewController = makeRegistrationAccountViewController()

        push(viewController)
        super.needShowNavigationBar()
    }
    
    func openRecoveryPasswordAlert() {
        let viewController = RecoveryPasswordAlert()
        present(viewController, animated: true)
    }

    func makeRegistrationAccountViewController() ->  AccountRegistrationViewController {
        let router = AccountRegistrationRouter(
            networkService: networkService,
            authManager: authManager, 
            verificationPhoneService: verificationPhoneService,
            navigationController: makeNavigationController()
        )
        let presenter = AccountRegistrationPresenterImpl(
            router: router,
            analyticsManager: analyticsManager,
            networkService: networkService, 
            verificationPhoneService: verificationPhoneService)
        let viewController = AccountRegistrationViewController(
            presenter: presenter
        )
        presenter.view = viewController
        return viewController
    }
    
    func makeVerificationPhoneViewController(with userData: UserData) -> VerificationPhoneViewController {
        let router = VerificationPhoneRouter(
            networkService: networkService,
            authManager: authManager,
            verificationPhoneService: verificationPhoneService,
            navigationController: makeNavigationController()
        )

        let presenter = VerificationPhonePresenterImpl(
            router: router,
            userData: userData,
            verificationPhoneService: verificationPhoneService
        )

        let viewController = VerificationPhoneViewController(presenter: presenter)
        presenter.setView(viewController)
        return viewController
    }
    
    func showErrorAlert(with message: String) {
        let alert = UIAlertController(
            title: Localizable.error(),
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(
            title: Localizable.okey(),
            style: .default,
            handler: nil)
        )
        present(alert, animated: true)
    }
}
